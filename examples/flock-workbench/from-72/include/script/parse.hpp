#pragma once
#include "lex.hpp"

namespace ink {
enum class Op { Number,
                Bool,
                Variable,
                Unary,
                Binary,
                Call };
enum class St { Let,
                Assign,
                Expression,
                Branch,
                Return };

struct Expr {
    Op op;
    std::size_t at;
    std::string text;
    std::vector<int> args;
};

struct Statement {
    St kind;
    std::size_t at;
    std::string name;
    int expression = -1;
    std::vector<int> yes, no;
};

struct Function {
    std::size_t at = 0;
    std::vector<std::string> params;
    std::vector<int> body;
};

struct Program {
    std::string source;
    std::vector<Expr> expressions;
    std::vector<Statement> statements;
    std::vector<int> initializers;
    std::map<std::string, Function> functions;
};

#if LAB_CHECKPOINT >= 7203
class Parser {
    Program p;
    std::vector<Word> tokens;
    std::size_t index = 0;

    const Word& top() const {
        return tokens.at(index);
    }

    bool take(std::string_view s) {
        if (top().text != s)
            return false;
        ++index;
        return true;
    }

    void need(std::string_view s) {
        if (!take(s))
            tiny::fail(p.source, top().offset, "expected " + std::string(s));
    }

    void depth(int level) const {
        if (level > 48)
            tiny::fail(p.source, top().offset, "syntax nesting exceeds 48");
    }

    std::string name() {
        const auto w = top();
        static const std::set<std::string> reserved{"let", "if", "else", "function", "return", "true", "false"};
        if (w.kind != Lex::Name || reserved.contains(w.text) || w.text.size() > 40)
            tiny::fail(p.source, w.offset, "expected identifier");
        ++index;
        return w.text;
    }

    int put(Expr e) {
        p.expressions.push_back(std::move(e));
        return int(p.expressions.size() - 1);
    }

    static int precedence(std::string_view s) {
        if (s == "||")
            return 1;
        if (s == "&&")
            return 2;
        if (s == "==" || s == "!=")
            return 3;
        if (s == "<" || s == ">" || s == "<=" || s == ">=")
            return 4;
        if (s == "+" || s == "-")
            return 5;
        if (s == "*" || s == "/")
            return 6;
        return 0;
    }

    // [snippet expression]
    int expression(int minimum, int level) {
        depth(level);
        const Word first = top();
        int left = -1;
        if (take("(")) {
            left = expression(1, level + 1);
            need(")");
        } else if (take("-") || take("!"))
            left = put({Op::Unary, first.offset, first.text, {expression(7, level + 1)}});
        else if (first.kind == Lex::Number) {
            ++index;
            left = put({Op::Number, first.offset, first.text, {}});
        } else if (take("true") || take("false"))
            left = put({Op::Bool, first.offset, first.text, {}});
        else {
            auto id = name();
            if (take("(")) {
                Expr call{Op::Call, first.offset, id, {}};
                if (!take(")")) {
                    do {
                        call.args.push_back(expression(1, level + 1));
                    } while (take(","));
                    need(")");
                }
                left = put(std::move(call));
            } else
                left = put({Op::Variable, first.offset, id, {}});
        }
        while (precedence(top().text) >= minimum) {
            const auto op = tokens[index++];
            const int right = expression(precedence(op.text) + 1, level + 1);
            left = put({Op::Binary, op.offset, op.text, {left, right}});
        }
        return left;
    }

    // [/snippet expression]
    std::vector<int> block(int level) {
        depth(level);
        need("{");
        std::vector<int> body;
        while (!take("}")) {
            if (top().kind == Lex::End)
                tiny::fail(p.source, top().offset, "unclosed block");
            body.push_back(statement(level + 1));
        }
        return body;
    }

    // [snippet statements]
    int statement(int level) {
        depth(level);
        Statement s{St::Expression, top().offset, "", -1, {}, {}};
        if (take("if")) {
            s.kind = St::Branch;
            need("(");
            s.expression = expression(1, 0);
            need(")");
            s.yes = block(level);
            if (take("else"))
                s.no = block(level);
        } else {
            if (take("let")) {
                s.kind = St::Let;
                s.name = name();
                need("=");
            } else if (take("return"))
                s.kind = St::Return;
            else if (top().kind == Lex::Name && tokens.at(index + 1).text == "=") {
                s.kind = St::Assign;
                s.name = name();
                need("=");
            }
            s.expression = expression(1, 0);
            need(";");
        }
        p.statements.push_back(std::move(s));
        return int(p.statements.size() - 1);
    }

    // [/snippet statements]
    public:
    explicit Parser(std::string source) {
        p.source = std::move(source);
        tokens = lex(p.source);
    }

    Program run() {
        while (top().kind != Lex::End) {
            if (top().text == "let") {
                p.initializers.push_back(statement(0));
                continue;
            }
            const auto at = top().offset;
            need("function");
            const auto id = name();
            Function fn;
            fn.at = at;
            need("(");
            if (!take(")")) {
                do {
                    auto param = name();
                    if (fn.params.size() >= 8 || std::find(fn.params.begin(), fn.params.end(), param) != fn.params.end())
                        tiny::fail(p.source, at, "invalid/duplicate parameter");
                    fn.params.push_back(param);
                } while (take(","));
                need(")");
            }
            fn.body = block(0);
            if (p.functions.size() >= 64 || !p.functions.emplace(id, std::move(fn)).second)
                tiny::fail(p.source, at, "duplicate function or limit 64");
        }
        return std::move(p);
    }
};
#endif
} // namespace ink
