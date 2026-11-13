#pragma once

#include "sculpt_export_jobs.hpp"
#include <iostream>

namespace sculpt {

inline std::string pathText(const std::filesystem::path& path) {
    const auto text = path.u8string();
    return {reinterpret_cast<const char*>(text.data()), text.size()};
}

class LoadFieldJob {
    public:
    LoadFieldJob(GlApi& gl, GpuBudget& budget, const std::filesystem::path& source)
        : source_(source) {
        if (!std::filesystem::is_regular_file(source))
            throw std::invalid_argument("Field import requires a regular local file");
        input_.open(source, std::ios::binary);
        if (!input_)
            throw std::runtime_error("Cannot open the requested field archive");
        reader_ = std::make_unique<FieldReader>(input_);
        const auto expectedBytes = fieldHeaderSize + reader_->header().settings.grid.sampleCount() * sizeof(float);
        if (std::filesystem::file_size(source) != expectedBytes)
            throw std::invalid_argument("Field file size does not match its exact declared sample count");
        preflightSculpt(gl, reader_->header().settings);
        // The current document is not touched. Only this private candidate receives imported batches.
        candidate_ = std::make_unique<GpuMeshBuilder>(gl, budget, reader_->header().settings, false, FieldInitialization::archive);
    }

    bool complete() const {
        return complete_;
    }

    bool cancelled() const {
        return cancelled_;
    }

    void cancel() {
        cancelRequested_ = true;
    }

    double progress() const {
        if (checked_)
            return 0.5 + 0.5 * candidate_->completedChunks() / std::max<std::size_t>(1, candidate_->jobChunks());
        return 0.5 * reader_->readCount() / reader_->header().settings.grid.sampleCount();
    }

    void tick() {
        if (complete_ || cancelled_)
            return;
        if (std::chrono::steady_clock::now() - began_ > std::chrono::seconds(60))
            throw std::runtime_error("Field load exceeded its overall 60-second deadline");
        if (cancelRequested_)
            candidate_->cancel();
        candidate_->tick();
        if (candidate_->state() == MeshJobState::failed)
            throw std::runtime_error("Loaded field remesh failed: " + candidate_->error());
        if (cancelRequested_) {
            if (!candidate_->gpuBusy())
                cancelled_ = true;
            return;
        }
        if (candidate_->gpuBusy())
            return;
        if (!checked_) {
            if (reader_->readCount() < reader_->header().settings.grid.sampleCount())
                candidate_->appendImport(reader_->next());
            else {
                reader_->finish();
                input_.close();
                candidate_->finishImport();
                checked_ = true;
            }
        } else if (candidate_->ready())
            complete_ = true;
    }

    std::unique_ptr<GpuMeshBuilder> takeModel() {
        if (!complete_ || !candidate_ || !candidate_->ready())
            throw std::logic_error("An incomplete or invalid archive cannot replace the current model");
        return std::move(candidate_);
    }

    private:
    std::filesystem::path source_;
    std::ifstream input_;
    std::unique_ptr<FieldReader> reader_;
    std::unique_ptr<GpuMeshBuilder> candidate_;
    std::chrono::steady_clock::time_point began_{std::chrono::steady_clock::now()};
    bool checked_{}, complete_{}, cancelled_{}, cancelRequested_{};
};

class NativeFileTasks {
    public:
    NativeFileTasks(GlApi& gl, GpuBudget& budget)
        : gl_(gl), budget_(budget) {}

    bool busy() const {
        return save_ || export_ || load_;
    }

    const std::string& status() const {
        return status_;
    }

    const std::string& error() const {
        return error_;
    }

    const std::filesystem::path& lastSaved() const {
        return lastSaved_;
    }

    bool takeRetainedLoad() {
        const bool result = retainedLoad_;
        retainedLoad_ = false;
        return result;
    }

    double progress() const {
        if (save_)
            return save_->progress();
        if (export_)
            return export_->progress();
        if (load_)
            return load_->progress();
        return 1;
    }

    void save(const GpuMeshBuilder& model) {
        if (busy()) {
            status_ = "ONE FILE JOB AT A TIME / C TO CANCEL";
            return;
        }
        try {
            save_ = std::make_unique<SaveFieldJob>(gl_, budget_, model);
            status_ = "SAVE FIELD / FROZEN GPU SNAPSHOT";
            error_.clear();
        } catch (const std::exception& error) {
            report(error);
        }
    }

    void exportMesh(const GpuMeshBuilder& model) {
        if (busy()) {
            status_ = "ONE FILE JOB AT A TIME / C TO CANCEL";
            return;
        }
        try {
            export_ = std::make_unique<ExportMeshJob>(model);
            status_ = "EXPORT OBJ / EXACT PUBLISHED MESH";
            error_.clear();
        } catch (const std::exception& error) {
            report(error);
        }
    }

    bool load(const std::filesystem::path& path) {
        if (busy()) {
            status_ = "ONE FILE JOB AT A TIME / C TO CANCEL";
            return false;
        }
        if (path.empty()) {
            status_ = "SAVE FIRST OR START WITH --load FILE";
            return false;
        }
        try {
            load_ = std::make_unique<LoadFieldJob>(gl_, budget_, path);
            loadingPath_ = path;
            status_ = "LOAD FIELD / KEEP PREVIOUS MESH UNTIL READY";
            error_.clear();
            return true;
        } catch (const std::exception& error) {
            report(error);
            return false;
        }
    }

    void cancel() {
        if (save_)
            save_->cancel();
        if (export_)
            export_->cancel();
        if (load_)
            load_->cancel();
    }

    void tick() {
        try {
            if (save_) {
                save_->tick();
                if (save_->stage() == FileStage::complete) {
                    lastSaved_ = save_->path();
                    std::cout << "FIELD SAVED " << pathText(lastSaved_) << '\n';
                    status_ = "SAVED FIELD / O TO REOPEN";
                    save_.reset();
                } else if (save_->stage() == FileStage::cancelled) {
                    std::cout << "FIELD SAVE CANCELLED / PARTIAL RETAINED " << pathText(save_->partialPath()) << '\n';
                    status_ = "SAVE CANCELLED / PARTIAL NOT PUBLISHED";
                    save_.reset();
                }
            } else if (export_) {
                export_->tick();
                if (export_->stage() == FileStage::complete) {
                    std::cout << "MESH EXPORTED AND PARSED " << pathText(export_->path()) << '\n';
                    status_ = "EXPORTED OBJ / READ-BACK VERIFIED";
                    export_.reset();
                } else if (export_->stage() == FileStage::cancelled) {
                    std::cout << "MESH EXPORT CANCELLED / PARTIAL RETAINED " << pathText(export_->partialPath()) << '\n';
                    status_ = "EXPORT CANCELLED / PARTIAL NOT PUBLISHED";
                    export_.reset();
                }
            } else if (load_) {
                load_->tick();
                if (load_->complete()) {
                    loaded_ = load_->takeModel();
                    lastSaved_ = loadingPath_;
                    std::cout << "FIELD LOADED AND REMESHED " << pathText(lastSaved_) << '\n';
                    status_ = "LOADED FIELD / HISTORY CLEARED";
                    load_.reset();
                } else if (load_->cancelled()) {
                    status_ = "LOAD CANCELLED / PREVIOUS DOCUMENT KEPT";
                    retainedLoad_ = true;
                    load_.reset();
                }
            }
        } catch (const std::exception& error) {
            report(error);
            if (load_)
                retainedLoad_ = true;
            save_.reset();
            export_.reset();
            load_.reset();
        }
    }

    std::unique_ptr<GpuMeshBuilder> takeLoaded() {
        return std::move(loaded_);
    }

    private:
    void report(const std::exception& error) {
        status_ = error.what();
        error_ = status_;
        std::cerr << "FILE JOB FAILED / CURRENT DOCUMENT KEPT: " << error.what() << '\n';
    }

    GlApi& gl_;
    GpuBudget& budget_;
    std::unique_ptr<SaveFieldJob> save_;
    std::unique_ptr<ExportMeshJob> export_;
    std::unique_ptr<LoadFieldJob> load_;
    std::unique_ptr<GpuMeshBuilder> loaded_;
    std::filesystem::path lastSaved_, loadingPath_;
    std::string status_, error_;
    bool retainedLoad_{};
};

} // namespace sculpt
