#pragma once

#include "sculpt_limits.hpp"
#include <bit>
#include <charconv>
#include <iomanip>
#include <istream>
#include <locale>
#include <optional>
#include <ostream>
#include <span>
#include <string>

namespace sculpt {

struct MeshFileSummary {
    std::uint64_t vertices{}, normals{}, triangles{};
    std::uint64_t hash{14695981039346656037ULL};
    Vec3 minimum{32, 32, 32}, maximum{-32, -32, -32};
};

inline void hashMeshVector(MeshFileSummary& summary, Vec3 value) {
    for (const float component : {value.x, value.y, value.z}) {
        const auto bits = std::bit_cast<std::uint32_t>(component);
        for (unsigned byte = 0; byte < 4; ++byte) {
            summary.hash ^= (bits >> (byte * 8)) & 255;
            summary.hash *= 1099511628211ULL;
        }
    }
}

inline void includeMeshPoint(MeshFileSummary& summary, Vec3 point) {
    if (!finite(point) || std::abs(point.x) > 32 || std::abs(point.y) > 32 || std::abs(point.z) > 32)
        throw std::invalid_argument("Mesh file has a nonfinite or out-of-range world position");
    summary.minimum.x = std::min(summary.minimum.x, point.x);
    summary.minimum.y = std::min(summary.minimum.y, point.y);
    summary.minimum.z = std::min(summary.minimum.z, point.z);
    summary.maximum.x = std::max(summary.maximum.x, point.x);
    summary.maximum.y = std::max(summary.maximum.y, point.y);
    summary.maximum.z = std::max(summary.maximum.z, point.z);
    hashMeshVector(summary, point);
}

class MeshWriter {
    public:
    explicit MeshWriter(std::ostream& stream)
        : stream_(stream) {
        stream_.imbue(std::locale::classic());
        stream_ << std::setprecision(std::numeric_limits<float>::max_digits10);
        stream_ << "# Volume Sculptor / actual extracted mesh / triangles with outward normals\n";
    }

    void append(std::span<const SurfaceVertex> vertices) {
        if (vertices.size() % 3 != 0 || vertices.size() > 4095 || summary_.vertices + vertices.size() > maximumMeshVertices)
            throw std::invalid_argument("OBJ export needs a bounded batch of complete triangles");
        // Validate the entire batch before writing any of its records.
        for (const auto& vertex : vertices) {
            const auto point = positionOf(vertex), normal = normalOf(vertex);
            if (!finite(point) || std::abs(point.x) > 32 || std::abs(point.y) > 32 || std::abs(point.z) > 32 || !finite(normal) || std::abs(length(normal) - 1) > 0.001F || vertex.position[3] != 1 || vertex.normal[3] != 0)
                throw std::invalid_argument("OBJ export has an invalid packed position or unit normal");
        }
        for (std::size_t first = 0; first < vertices.size(); first += 3) {
            const auto a = positionOf(vertices[first]), b = positionOf(vertices[first + 1]), c = positionOf(vertices[first + 2]);
            if (dot(cross(b - a, c - a), cross(b - a, c - a)) <= 1e-24F)
                throw std::invalid_argument("OBJ export cannot publish a degenerate triangle");
        }
        for (std::size_t first = 0; first < vertices.size(); first += 3) {
            const auto begin = summary_.vertices + 1;
            for (std::size_t index = 0; index < 3; ++index) {
                const auto point = positionOf(vertices[first + index]), normal = normalOf(vertices[first + index]);
                stream_ << "v " << point.x << ' ' << point.y << ' ' << point.z << '\n';
                stream_ << "vn " << normal.x << ' ' << normal.y << ' ' << normal.z << '\n';
                includeMeshPoint(summary_, point);
                hashMeshVector(summary_, normal);
                ++summary_.vertices;
                ++summary_.normals;
            }
            stream_ << "f " << begin << "//" << begin << ' ' << begin + 1 << "//" << begin + 1 << ' ' << begin + 2 << "//" << begin + 2 << '\n';
            ++summary_.triangles;
        }
        if (!stream_)
            throw std::runtime_error("OBJ write failed; the partial output was not published");
    }

    const MeshFileSummary& summary() const {
        return summary_;
    }

    private:
    std::ostream& stream_;
    MeshFileSummary summary_;
};

class MeshReader {
    public:
    explicit MeshReader(std::istream& stream)
        : stream_(stream) {}

    bool complete() const {
        return complete_;
    }

    const MeshFileSummary& summary() const {
        return summary_;
    }

    void readBatch(std::size_t maximumLines = 2048) {
        if (maximumLines == 0 || maximumLines > 2048)
            throw std::invalid_argument("OBJ parsing needs a bounded line batch");
        for (std::size_t index = 0; index < maximumLines && !complete_; ++index) {
            const auto line = readLine();
            if (!line) {
                if (summary_.vertices == 0 || summary_.vertices != summary_.normals || summary_.triangles == 0 || summary_.triangles * 3 != summary_.vertices)
                    throw std::invalid_argument("OBJ file has no valid position/normal triangle mesh");
                complete_ = true;
                break;
            }
            parseLine(*line);
        }
    }

    private:
    std::optional<std::string> readLine() {
        std::string result;
        std::size_t rawLength = 0;
        char character{};
        while (stream_.get(character)) {
            if (++bytes_ > 512 * 1024 * 1024)
                throw std::invalid_argument("OBJ input exceeds its 512 MiB file budget");
            if (character == '\n')
                return result;
            if (++rawLength > 255)
                throw std::invalid_argument("OBJ line exceeds 255 bytes; refusing unbounded input");
            if (character != '\r')
                result.push_back(character);
        }
        if (stream_.bad() || (!stream_.eof() && stream_.fail()))
            throw std::runtime_error("OBJ read failed");
        if (!result.empty())
            return result;
        return {};
    }

    static std::string_view token(std::string_view& text) {
        const auto first = text.find_first_not_of(" \t");
        if (first == std::string_view::npos) {
            text = {};
            return {};
        }
        text.remove_prefix(first);
        const auto end = text.find_first_of(" \t");
        if (end == std::string_view::npos) {
            const auto result = text;
            text = {};
            return result;
        }
        const auto result = text.substr(0, end);
        text.remove_prefix(end);
        return result;
    }

    template <class Number>
    static Number number(std::string_view text) {
        if (text.empty())
            throw std::invalid_argument("OBJ is missing a numeric token");
        Number result{};
        const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
        if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size())
            throw std::invalid_argument("OBJ has an invalid numeric token");
        return result;
    }

    void parseLine(std::string_view line) {
        const auto kind = token(line);
        if (kind.empty() || kind.front() == '#')
            return;
        if (kind == "v" || kind == "vn") {
            Vec3 value;
            value.x = number<float>(token(line));
            value.y = number<float>(token(line));
            value.z = number<float>(token(line));
            if (!token(line).empty())
                throw std::invalid_argument("OBJ vector has trailing fields");
            if (kind == "v") {
                if (++summary_.vertices > maximumMeshVertices)
                    throw std::invalid_argument("OBJ exceeds the declared vertex budget");
                includeMeshPoint(summary_, value);
                lastPoints_[(summary_.vertices - 1) % 3] = value;
            } else {
                if (++summary_.normals > maximumMeshVertices || !finite(value) || std::abs(length(value) - 1) > 0.001F)
                    throw std::invalid_argument("OBJ normal is not a finite unit vector within budget");
                hashMeshVector(summary_, value);
            }
        } else if (kind == "f") {
            std::array<std::uint64_t, 3> positions{};
            for (int corner = 0; corner < 3; ++corner) {
                const auto face = token(line);
                const auto separator = face.find("//");
                if (separator == std::string_view::npos)
                    throw std::invalid_argument("This OBJ reader expects triangle position//normal records");
                const auto position = number<std::uint64_t>(face.substr(0, separator));
                const auto normal = number<std::uint64_t>(face.substr(separator + 2));
                if (position == 0 || position > summary_.vertices || normal == 0 || normal > summary_.normals || summary_.vertices < 3 || position != summary_.vertices - 2 + corner || normal != position)
                    throw std::invalid_argument("Streamed OBJ face must reference its three just-written position/normal pairs");
                positions[corner] = position;
            }
            if (!token(line).empty() || summary_.vertices != summary_.normals || summary_.vertices % 3 != 0 || summary_.triangles + 1 != summary_.vertices / 3 || ++summary_.triangles > maximumMeshVertices / 3)
                throw std::invalid_argument("OBJ has a non-triangle, repeated index or excessive face count");
            const auto area = cross(lastPoints_[1] - lastPoints_[0], lastPoints_[2] - lastPoints_[0]);
            if (dot(area, area) <= 1e-24F)
                throw std::invalid_argument("OBJ contains a degenerate triangle");
        } else
            throw std::invalid_argument("Unsupported OBJ record; this is a strict reader for the documented exporter");
    }

    std::istream& stream_;
    MeshFileSummary summary_;
    std::array<Vec3, 3> lastPoints_;
    std::size_t bytes_{};
    bool complete_{};
};

} // namespace sculpt
