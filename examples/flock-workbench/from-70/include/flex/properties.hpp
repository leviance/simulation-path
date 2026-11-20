#pragma once
#include "markup/source.hpp"

namespace tiny {
// Mỗi property có miền hữu hạn: không tự đoán đơn vị hoặc cách xuống dòng.
inline bool flexProperty(std::string_view key, std::string_view value, std::string_view source, std::size_t at) {
    if (key == "display") {
        if (value == "flex" || value == "block")
            return true;
    } else if (key == "flex-direction") {
        if (value == "row" || value == "column")
            return true;
    } else if (key == "justify-content") {
        if (value == "start" || value == "center" || value == "end" || value == "space-between")
            return true;
    } else if (key == "align-items") {
        if (value == "start" || value == "center" || value == "end" || value == "stretch")
            return true;
    } else if (key == "flex-grow") {
        const double grow = number(value, source, at);
        if (grow >= 0 && grow <= 8)
            return true;
    } else if (key == "flex-basis") {
        if (value == "auto")
            return true;
        if (value.ends_with("px")) {
            const double basis = number(value.substr(0, value.size() - 2), source, at);
            if (basis >= 0 && basis <= 600)
                return true;
        }
    } else
        return false;
    fail(source, at, "bad value for " + std::string(key));
}
} // namespace tiny
