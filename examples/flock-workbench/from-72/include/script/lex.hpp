#pragma once
#include "markup/source.hpp"
#include <variant>

namespace ink {
using Value = std::variant<double, bool>;
enum class Lex { Name,
                 Number,
                 Symbol,
                 End };

struct Word {
    Lex kind = Lex::End;
    std::string text;
    std::size_t offset = 0;
};

#if LAB_CHECKPOINT >= 7202
// [snippet lex]
inline std::vector<Word> lex(std::string_view source) {
    tiny::checkUtf8(source);
    tiny::Cursor c{source};
    c.take("\xef\xbb\xbf");
    std::vector<Word> result;
    while (true) {
        c.skip();
        if (c.take("//")) {
            while (c.peek() && c.peek() != '\n')
                ++c.pos;
            continue;
        }
        if (!c.peek())
            break;
        const auto at = c.pos;
        Lex kind = Lex::Symbol;
        if (tiny::letter(c.peek()) || c.peek() == '_') {
            kind = Lex::Name;
            do {
                ++c.pos;
            } while (tiny::letter(c.peek()) || tiny::digit(c.peek()) || c.peek() == '_');
        } else if (tiny::digit(c.peek())) {
            kind = Lex::Number;
            do {
                ++c.pos;
            } while (tiny::digit(c.peek()));
            if (c.take('.')) {
                if (!tiny::digit(c.peek()))
                    tiny::fail(source, c.pos, "digit after decimal point");
                while (tiny::digit(c.peek()))
                    ++c.pos;
            }
        } else if (!c.take("==") && !c.take("!=") && !c.take("<=") && !c.take(">=") && !c.take("&&") && !c.take("||")) {
            if (std::string_view("(){};,+-*/=!<>").find(c.peek()) == std::string_view::npos)
                tiny::fail(source, at, "unexpected script character");
            ++c.pos;
        }
        if (result.size() >= 4096)
            tiny::fail(source, at, "more than 4096 tokens");
        result.push_back({kind, std::string(source.substr(at, c.pos - at)), at});
    }
    result.push_back({Lex::End, "", c.pos});
    return result;
}

// [/snippet lex]
#endif
} // namespace ink
