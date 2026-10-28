#pragma once
#include "mesh.hpp"
#include <filesystem>

namespace obj21 {
// Mọi quy ước index của OBJ được giải quyết ngay tại biên đọc file.
inline std::optional<std::size_t> resolveObjPositionIndex(
    std::string_view token,
    std::size_t positionCount
) {
    const std::size_t slash = token.find('/');
    if (slash != std::string_view::npos) {
        const std::string_view suffix = token.substr(slash + 1);
        const std::size_t secondSlash = suffix.find('/');
        const auto validAttribute = [](std::string_view field) {
            int value = 0;
            const auto parsed = std::from_chars(field.data(), field.data() + field.size(), value);
            return parsed.ec == std::errc{} && parsed.ptr == field.data() + field.size() && value != 0;
        };
        if (secondSlash == std::string_view::npos) {
            if (!validAttribute(suffix)) {
                return std::nullopt;
            }
        } else {
            const auto texture = suffix.substr(0, secondSlash);
            const auto normal = suffix.substr(secondSlash + 1);
            if ((!texture.empty() && !validAttribute(texture)) || !validAttribute(normal)) {
                return std::nullopt;
            }
        }
        token = token.substr(0, slash);
    }
    if (token.empty()) {
        return std::nullopt;
    }

    // Chỉ nhận bốn dạng v, v/vt, v//vn và v/vt/vn.
    // Thuộc tính chưa dùng vẫn phải có cú pháp integer hợp lệ.
    int rawIndex = 0;
    const char* begin = token.data();
    const char* end = token.data() + token.size();
    const auto parsed = std::from_chars(begin, end, rawIndex);
    if (parsed.ec != std::errc{} || parsed.ptr != end || rawIndex == 0) {
        return std::nullopt;
    }

    long long resolved = 0;
    if (rawIndex > 0) {
        resolved = static_cast<long long>(rawIndex) - 1;
    } else {
        resolved = static_cast<long long>(positionCount) + rawIndex;
    }
    if (resolved < 0 || resolved >= static_cast<long long>(positionCount)) {
        return std::nullopt;
    }
    return static_cast<std::size_t>(resolved);
}

// Fan chỉ đúng với polygon phẳng, lồi. Không âm thầm tô sai một face lõm.
inline bool isConvexPlanarFace(const ObjMesh& mesh, const std::vector<std::size_t>& corners) {
    const Vec3 origin = mesh.positions[corners[0]];
    Vec3 area{};
    double extent = 0.0;
    for (std::size_t index = 0; index < corners.size(); ++index) {
        const Vec3 a = mesh.positions[corners[index]] - origin;
        const Vec3 b = mesh.positions[corners[(index + 1) % corners.size()]] - origin;
        area = area + cross(a, b);
        extent = std::max(extent, length(a));
    }
    const auto normal = normalized(area, extent * extent * 1e-12);
    if (!normal) {
        return false;
    }
    const double tolerance = std::max(1e-12, extent * 1e-6);
    for (std::size_t index = 0; index < corners.size(); ++index) {
        const Vec3 a = mesh.positions[corners[index]];
        const Vec3 b = mesh.positions[corners[(index + 1) % corners.size()]];
        const Vec3 c = mesh.positions[corners[(index + 2) % corners.size()]];
        if (std::abs(dot(a - origin, *normal)) > tolerance || dot(cross(b - a, c - b), *normal) < -tolerance * extent) {
            return false;
        }
        for (std::size_t other = index + 1; other < corners.size(); ++other) {
            if (length(a - mesh.positions[corners[other]]) < tolerance) {
                return false;
            }
        }
        // Mọi corner phải cùng phía mỗi cạnh; kiểm này còn chặn polygon tự cắt.
        for (const auto corner : corners) {
            if (dot(cross(b - a, mesh.positions[corner] - a), *normal) < -tolerance * extent) {
                return false;
            }
        }
    }
    return true;
}

inline void appendTriangleFan(
    ObjMesh& mesh,
    const std::vector<std::size_t>& corners,
    std::size_t sourceFace,
    std::size_t sourceLine
) {
    for (std::size_t index = 1; index + 1 < corners.size(); ++index) {
        mesh.triangles.push_back({
            {corners[0], corners[index], corners[index + 1]},
            sourceFace,
            sourceLine,
        });
    }
}

inline ObjLoadResult parseObj(std::istream& input) {
    ObjLoadResult result{};
    std::string line{};
    std::size_t lineNumber = 0;

    std::size_t byteCount = 0;
    while (std::getline(input, line)) {
        ++lineNumber;
        if (lineNumber == 1 && line.starts_with("\xEF\xBB\xBF")) {
            line.erase(0, 3);
        }
        byteCount += line.size() + 1;
        if (byteCount > 8 * 1024 * 1024 || line.size() > 16384 || result.mesh.positions.size() >= 200000 || result.mesh.triangles.size() >= 400000) {
            addDiagnostic(result, lineNumber, "vượt giới hạn OBJ: 8 MiB, dòng 16 KiB, 200k vertex, 400k triangle");
            break;
        }
        if (result.diagnostics.size() >= 64) {
            break;
        }
        const auto comment = line.find('#');
        if (comment != std::string::npos) {
            line.erase(comment);
        }
        std::istringstream record(line);
        std::string keyword{};
        if (!(record >> keyword) || keyword.starts_with('#')) {
            continue;
        }

        if (keyword == "v") {
            Vec3 position{};
            if (!(record >> position.x >> position.y >> position.z) ||
                !std::isfinite(position.x) ||
                !std::isfinite(position.y) ||
                !std::isfinite(position.z)) {
                addDiagnostic(result, lineNumber, "record v cần ba tọa độ hữu hạn");
                continue;
            }
            std::string extra{};
            if ((record >> extra) || std::max({std::abs(position.x), std::abs(position.y), std::abs(position.z)}) > 1000000.0) {
                addDiagnostic(result, lineNumber, "chỉ hỗ trợ v x y z, mỗi tọa độ trong [-1e6, 1e6]");
                continue;
            }
            result.mesh.positions.push_back(position);
            continue;
        }

        if (keyword == "f") {
            ++result.sourceFaceCount;
            std::vector<std::size_t> corners{};
            std::string token{};
            bool faceValid = true;
            while (record >> token) {
                if (token.starts_with('#')) {
                    break;
                }
                const std::optional<std::size_t> resolved = resolveObjPositionIndex(
                    token,
                    result.mesh.positions.size()
                );
                if (!resolved) {
                    addDiagnostic(result, lineNumber, "face chứa position index không hợp lệ: " + token);
                    faceValid = false;
                    break;
                }
                corners.push_back(*resolved);
                if (corners.size() > 128) {
                    addDiagnostic(result, lineNumber, "face vượt giới hạn 128 corner");
                    faceValid = false;
                    break;
                }
            }
            if (!faceValid) {
                continue;
            }
            if (corners.size() < 3) {
                addDiagnostic(result, lineNumber, "record f cần ít nhất ba corner");
                continue;
            }
            if (!isConvexPlanarFace(result.mesh, corners)) {
                addDiagnostic(result, lineNumber, "face phải phẳng, lồi và không có corner trùng");
                continue;
            }
            appendTriangleFan(result.mesh, corners, result.sourceFaceCount, lineNumber);
            continue;
        }

        if (keyword == "vt" || keyword == "vn" || keyword == "o" || keyword == "g" ||
            keyword == "s" || keyword == "usemtl" || keyword == "mtllib") {
            ++result.ignoredRecordCount;
            continue;
        }
        addDiagnostic(result, lineNumber, "record chưa hỗ trợ: " + keyword);
    }

    if (input.bad()) {
        addDiagnostic(result, lineNumber, "lỗi I/O khi đọc stream");
    }
    if (result.mesh.positions.empty()) {
        addDiagnostic(result, 0, "OBJ không chứa position hợp lệ");
    }
    return result;
}

inline ObjLoadResult loadObjFile(const std::string& path) {
    std::error_code error{};
    const auto nativePath = std::filesystem::path(std::u8string(path.begin(), path.end()));
    const auto size = std::filesystem::file_size(nativePath, error);
    if (!error && size > 8 * 1024 * 1024) {
        ObjLoadResult result{};
        addDiagnostic(result, 0, "file vượt giới hạn 8 MiB: " + path);
        return result;
    }
    std::ifstream input(nativePath);
    if (!input) {
        ObjLoadResult result{};
        result.opened = false;
        addDiagnostic(result, 0, "không mở được file: " + path);
        return result;
    }
    return parseObj(input);
}

} // namespace obj21
