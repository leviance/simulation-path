#pragma once

#include "sculpt_field_file.hpp"
#include "sculpt_gpu_mesh.hpp"
#include "sculpt_mesh_file.hpp"
#include <filesystem>
#include <fstream>

namespace sculpt {

enum class FileStage { copying,
                       writing,
                       checking,
                       complete,
                       cancelled };

inline std::filesystem::path reserveOutputDirectory(std::string_view kind) {
    if (kind.empty() || kind.size() > 32 || !std::all_of(kind.begin(), kind.end(), [](char c) {
            return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-';
        }))
        throw std::invalid_argument("Output kind must be a short filename-safe identifier");
    const auto root = std::filesystem::absolute(".runtime/volume-sculptor").lexically_normal();
    std::filesystem::create_directories(root);
    const auto stamp = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    for (unsigned attempt = 0; attempt < 32; ++attempt) {
        const auto directory = root / (std::string(kind) + "-" + std::to_string(stamp) + "-" + std::to_string(attempt));
        if (std::filesystem::create_directory(directory))
            return directory;
    }
    throw std::runtime_error("Could not reserve a fresh output directory; no existing files were overwritten");
}

class SaveFieldJob {
    public:
    SaveFieldJob(GlApi& gl, GpuBudget& budget, const GpuMeshBuilder& model)
        : gl_(gl), settings_(model.settings()), ticket_(gl) {
        if (!model.ready())
            throw std::logic_error("Saving requires a complete current field/mesh pair");
        const auto payload = settings_.grid.sampleCount() * sizeof(float);
        snapshot_ = std::make_unique<GpuBuffer>(gl, budget, payload + guardBytes);
        snapshot_->setGuard(payload);
        directory_ = reserveOutputDirectory("field");
        partial_ = directory_ / "field.partial";
        output_.open(partial_, std::ios::binary | std::ios::out);
        if (!output_)
            throw std::runtime_error("Cannot open a new field output file");
        writer_ = std::make_unique<FieldWriter>(output_, settings_);
        // Freeze on the device before later brush commands. Only saving reads this snapshot to CPU.
        gl_.BindBuffer(GL_COPY_READ_BUFFER, model.document().field().id());
        gl_.BindBuffer(GL_COPY_WRITE_BUFFER, snapshot_->id());
        ticket_.begin(0);
        gl_.CopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, 0, 0, static_cast<GLsizeiptr>(payload));
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
    }

    FileStage stage() const {
        return stage_;
    }

    const std::filesystem::path& partialPath() const {
        return partial_;
    }

    std::filesystem::path path() const {
        return directory_ / "field.scl";
    }

    void cancel() {
        cancelRequested_ = true;
    }

    double progress() const {
        if (reader_)
            return 0.5 + 0.5 * reader_->readCount() / settings_.grid.sampleCount();
        return 0.5 * writer_->written() / settings_.grid.sampleCount();
    }

    void tick() {
        if (stage_ == FileStage::complete || stage_ == FileStage::cancelled)
            return;
        if (std::chrono::steady_clock::now() - began_ > std::chrono::seconds(60))
            throw std::runtime_error("Field save exceeded its overall 60-second deadline");
        if (ticket_.busy()) {
            if (!ticket_.poll())
                return;
            if (!snapshot_->guardIntact(settings_.grid.sampleCount() * sizeof(float)))
                throw std::runtime_error("Save snapshot canary was damaged");
            stage_ = FileStage::writing;
        }
        if (cancelRequested_) {
            output_.close();
            input_.close();
            snapshot_.reset();
            stage_ = FileStage::cancelled;
            return;
        }
        // snippet:sculpt-save-check-before-publish
        if (stage_ == FileStage::writing) {
            const auto count = std::min<std::size_t>(65536, settings_.grid.sampleCount() - writer_->written());
            std::vector<float> values(count);
            snapshot_->read(writer_->written() * sizeof(float), std::as_writable_bytes(std::span(values)));
            writer_->append(values);
            if (writer_->written() == settings_.grid.sampleCount()) {
                writer_->finish();
                output_.close();
                input_.open(partial_, std::ios::binary);
                if (!input_)
                    throw std::runtime_error("Cannot reopen saved field for verification");
                reader_ = std::make_unique<FieldReader>(input_);
                if (reader_->header().checksum != writer_->checksum())
                    throw std::runtime_error("Saved field checksum does not match its frozen source");
                stage_ = FileStage::checking;
            }
        } else if (stage_ == FileStage::checking) {
            reader_->next();
            if (reader_->readCount() == settings_.grid.sampleCount()) {
                reader_->finish();
                input_.close();
                std::filesystem::rename(partial_, path());
                snapshot_.reset();
                stage_ = FileStage::complete;
            }
        }
        // end-snippet:sculpt-save-check-before-publish
    }

    private:
    GlApi& gl_;
    ModelSettings settings_;
    GpuTicket ticket_;
    std::unique_ptr<GpuBuffer> snapshot_;
    std::filesystem::path directory_, partial_;
    std::ofstream output_;
    std::ifstream input_;
    std::unique_ptr<FieldWriter> writer_;
    std::unique_ptr<FieldReader> reader_;
    FileStage stage_{FileStage::copying};
    std::chrono::steady_clock::time_point began_{std::chrono::steady_clock::now()};
    bool cancelRequested_{};
};

class ExportMeshJob {
    public:
    explicit ExportMeshJob(const GpuMeshBuilder& model)
        : source_(model.active()) {
        for (const auto& chunk : source_)
            total_ += chunk.stats.vertices;
        if (model.activeGeneration() == 0 || total_ == 0 || total_ > maximumMeshVertices)
            throw std::logic_error("Export requires a nonempty complete published mesh");
        directory_ = reserveOutputDirectory("mesh");
        partial_ = directory_ / "mesh.partial";
        output_.open(partial_);
        if (!output_)
            throw std::runtime_error("Cannot open a new mesh output file");
        writer_ = std::make_unique<MeshWriter>(output_);
        output_ << "# meshGeneration " << model.activeGeneration() << " fieldRevision " << model.activeFieldRevision() << " isovalue " << model.activeSettings().isovalue << '\n';
    }

    FileStage stage() const {
        return stage_;
    }

    const std::filesystem::path& partialPath() const {
        return partial_;
    }

    std::filesystem::path path() const {
        return directory_ / "mesh.obj";
    }

    const MeshFileSummary& summary() const {
        return writer_->summary();
    }

    void cancel() {
        cancelRequested_ = true;
    }

    double progress() const {
        if (reader_)
            return 0.5 + 0.5 * reader_->summary().vertices / total_;
        return 0.5 * writer_->summary().vertices / total_;
    }

    void tick() {
        if (stage_ == FileStage::complete || stage_ == FileStage::cancelled)
            return;
        if (std::chrono::steady_clock::now() - began_ > std::chrono::seconds(60))
            throw std::runtime_error("Mesh export exceeded its overall 60-second deadline");
        if (cancelRequested_) {
            output_.close();
            input_.close();
            source_.clear();
            stage_ = FileStage::cancelled;
            return;
        }
        if (stage_ == FileStage::writing) {
            while (chunk_ < source_.size() && local_ == source_[chunk_].stats.vertices) {
                ++chunk_;
                local_ = 0;
            }
            if (chunk_ == source_.size()) {
                output_.flush();
                if (!output_)
                    throw std::runtime_error("Mesh flush failed");
                output_.close();
                input_.open(partial_);
                if (!input_)
                    throw std::runtime_error("Cannot reopen exported mesh for verification");
                reader_ = std::make_unique<MeshReader>(input_);
                stage_ = FileStage::checking;
                return;
            }
            const auto& source = source_[chunk_];
            if (local_ == 0 && !source.buffer->guardIntact(source.stats.vertices * sizeof(SurfaceVertex)))
                throw std::runtime_error("Export source chunk canary was damaged");
            const auto count = std::min<std::size_t>(4095, source.stats.vertices - local_);
            std::vector<SurfaceVertex> vertices(count);
            source.buffer->read(local_ * sizeof(SurfaceVertex), std::as_writable_bytes(std::span(vertices)));
            writer_->append(vertices);
            local_ += count;
        } else {
            // snippet:sculpt-obj-check-before-publish
            reader_->readBatch();
            if (reader_->complete()) {
                const auto& actual = reader_->summary();
                const auto& expected = writer_->summary();
                if (actual.vertices != total_ || actual.triangles != total_ / 3 || actual.normals != total_ || actual.hash != expected.hash)
                    throw std::runtime_error("Read-back OBJ does not match the exported geometry/normals");
                input_.close();
                std::filesystem::rename(partial_, path());
                source_.clear();
                stage_ = FileStage::complete;
            }
            // end-snippet:sculpt-obj-check-before-publish
        }
    }

    private:
    // Shared immutable buffers keep this exact mesh alive, even when the editor publishes a newer one.
    std::vector<MeshChunk> source_;
    std::filesystem::path directory_, partial_;
    std::ofstream output_;
    std::ifstream input_;
    std::unique_ptr<MeshWriter> writer_;
    std::unique_ptr<MeshReader> reader_;
    FileStage stage_{FileStage::writing};
    std::chrono::steady_clock::time_point began_{std::chrono::steady_clock::now()};
    std::uint64_t total_{};
    std::size_t chunk_{}, local_{};
    bool cancelRequested_{};
};

} // namespace sculpt
