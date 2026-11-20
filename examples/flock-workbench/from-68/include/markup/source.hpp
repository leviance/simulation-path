#pragma once
#include <algorithm>
#include <charconv>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <map>
#include <optional>
#include <set>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace tiny {
constexpr std::size_t maxBytes = 16384;

struct Error : std::runtime_error {
    explicit Error(const std::string& message)
        : std::runtime_error(message) {}
};

// Cột tính theo byte UTF-8, bắt đầu từ 1. Không có đường dẫn tuyệt đối ghi sẵn trong chương trình.
[[noreturn]] inline void fail(std::string_view source, std::size_t at, const std::string& reason) {
    unsigned line = 1, column = 1;
    for (std::size_t i = 0; i < std::min(at, source.size()); ++i) {
        if (source[i] == '\n') {
            ++line;
            column = 1;
        } else
            ++column;
    }
    throw Error(std::to_string(line) + ":" + std::to_string(column) + " " + reason);
}

// [snippet read-file]
inline std::string readFile(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary | std::ios::ate);
    if (!input)
        throw Error("1:1 cannot open " + path.filename().string());
    const std::streamoff length = input.tellg();
    if (length < 0 || length > static_cast<std::streamoff>(maxBytes))
        throw Error("1:1 file exceeds 16 KiB");
    std::string bytes(static_cast<std::size_t>(length), '\0');
    input.seekg(0);
    if (!input.read(bytes.data(), length))
        throw Error("1:1 incomplete file");
    return bytes;
}

// [/snippet read-file]

inline bool space(char c) {
    return c == ' ' || c == '\n' || c == '\r' || c == '\t';
}

inline bool letter(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

inline bool digit(char c) {
    return c >= '0' && c <= '9';
}

inline bool wordChar(char c) {
    return letter(c) || digit(c) || c == '-' || c == '_';
}

inline bool identifier(std::string_view s) {
    return !s.empty() && s.size() <= 32 && letter(s.front()) && std::all_of(s.begin(), s.end(), wordChar);
}

inline void checkUtf8(std::string_view text) {
    if (text.size() > maxBytes)
        fail(text, 0, "file exceeds 16 KiB");
    for (std::size_t i = 0; i < text.size();) {
        const auto lead = static_cast<unsigned char>(text[i]);
        if (lead < 128) {
            if (lead < 32 && !space(static_cast<char>(lead)))
                fail(text, i, "unexpected control byte");
            ++i;
            continue;
        }
        unsigned count = 0, code = 0, minimum = 0;
        if (lead >= 194 && lead <= 223) {
            count = 2;
            code = lead & 31;
            minimum = 128;
        } else if (lead >= 224 && lead <= 239) {
            count = 3;
            code = lead & 15;
            minimum = 2048;
        } else if (lead >= 240 && lead <= 244) {
            count = 4;
            code = lead & 7;
            minimum = 65536;
        }
        if (count == 0 || i + count > text.size())
            fail(text, i, "invalid UTF-8");
        for (unsigned j = 1; j < count; ++j) {
            const auto next = static_cast<unsigned char>(text[i + j]);
            if ((next & 192) != 128)
                fail(text, i + j, "invalid continuation byte");
            code = (code << 6) | (next & 63);
        }
        if (code < minimum || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff))
            fail(text, i, "invalid code point");
        i += count;
    }
}

struct Cursor {
    std::string_view source;
    std::size_t pos = 0;

    char peek() const {
        if (pos < source.size())
            return source[pos];
        return '\0';
    }

    bool take(char c) {
        if (peek() != c)
            return false;
        ++pos;
        return true;
    }

    bool take(std::string_view s) {
        if (!source.substr(pos).starts_with(s))
            return false;
        pos += s.size();
        return true;
    }

    void skip() {
        while (space(peek()))
            ++pos;
    }

    void need(char c) {
        if (!take(c))
            fail(source, pos, std::string("expected ") + c);
    }

    std::string word() {
        const auto start = pos;
        while (wordChar(peek()))
            ++pos;
        if (pos == start)
            fail(source, pos, "expected name");
        return std::string(source.substr(start, pos - start));
    }
};

inline double number(std::string_view s, std::string_view source, std::size_t at) {
    double value = 0;
    auto result = std::from_chars(s.data(), s.data() + s.size(), value);
    if (result.ec != std::errc{} || result.ptr != s.data() + s.size() || !std::isfinite(value) || std::abs(value) > 1000000)
        fail(source, at, "expected finite number");
    return value;
}
} // namespace tiny
