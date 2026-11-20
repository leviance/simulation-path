#pragma once
#include "host.hpp"

namespace ink {
#if LAB_CHECKPOINT >= 7204
struct Frame {
    std::vector<Names> locals{Names{}};
    bool topLevel = false;
};

class Machine {
    const Program& p;
    Names& global;
    Host& host;
    unsigned budget = 1024;
    unsigned calls = 0;

    // [snippet budget]
    void spend(std::size_t at) {
        if (!budget)
            tiny::fail(p.source, at, "handler exceeded 1024 steps");
        --budget;
    }

    // [/snippet budget]
    // [snippet lookup]
    Value* lookup(Frame& frame, const std::string& name) {
        for (auto it = frame.locals.rbegin(); it != frame.locals.rend(); ++it) {
            const auto v = it->find(name);
            if (v != it->end())
                return &v->second;
        }
        const auto found = global.find(name);
        if (found != global.end())
            return &found->second;
        return nullptr;
    }

    // [/snippet lookup]
    double finite(double n, std::size_t at) const {
        if (!std::isfinite(n) || std::abs(n) > 1e9)
            tiny::fail(p.source, at, "number outside finite range");
        return n;
    }

    Value eval(int index, Frame& f, unsigned depth) {
        const auto& e = p.expressions.at(index);
        spend(e.at);
        if (depth > 64)
            tiny::fail(p.source, e.at, "expression depth exceeds 64");
        if (e.op == Op::Number)
            return tiny::number(e.text, p.source, e.at);
        if (e.op == Op::Bool)
            return e.text == "true";
        if (e.op == Op::Variable) {
            const auto* v = lookup(f, e.text);
            if (!v)
                tiny::fail(p.source, e.at, "unknown variable: " + e.text);
            return *v;
        }
        if (e.op == Op::Call) {
            std::vector<Value> args;
            for (int child : e.args)
                args.push_back(eval(child, f, depth + 1));
            return call(e.text, args, e.at);
        }
        const auto left = eval(e.args[0], f, depth + 1);
        if (e.op == Op::Unary) {
            if (e.text == "!")
                return !logical(left, p.source, e.at);
            return -numeric(left, p.source, e.at);
        }
        // Không tính nhánh phải khi kết quả đã biết.
        if (e.text == "&&" && !logical(left, p.source, e.at))
            return false;
        if (e.text == "||" && logical(left, p.source, e.at))
            return true;
        const auto right = eval(e.args[1], f, depth + 1);
        if (e.text == "&&" || e.text == "||")
            return logical(right, p.source, e.at);
        if (e.text == "==" || e.text == "!=") {
            if (left.index() != right.index())
                tiny::fail(p.source, e.at, "comparison needs matching types");
            if (e.text == "==")
                return left == right;
            return left != right;
        }
        const double a = numeric(left, p.source, e.at), b = numeric(right, p.source, e.at);
        if (e.text == "+")
            return finite(a + b, e.at);
        if (e.text == "-")
            return finite(a - b, e.at);
        if (e.text == "*")
            return finite(a * b, e.at);
        if (e.text == "/") {
            if (b == 0)
                tiny::fail(p.source, e.at, "division by zero");
            return finite(a / b, e.at);
        }
        if (e.text == "<")
            return a < b;
        if (e.text == "<=")
            return a <= b;
        if (e.text == ">")
            return a > b;
        if (e.text == ">=")
            return a >= b;
        tiny::fail(p.source, e.at, "unknown operator");
    }

    // [snippet run-block]
    std::optional<Value> execute(const std::vector<int>& body, Frame& frame) {
        for (int i : body) {
            const auto& s = p.statements.at(i);
            spend(s.at);
            const Value v = eval(s.expression, frame, 0);
            if (s.kind == St::Return)
                return v;
            if (s.kind == St::Let) {
                Names* vars = &frame.locals.back();
                if (frame.topLevel)
                    vars = &global;
                if (!vars->emplace(s.name, v).second)
                    tiny::fail(p.source, s.at, "already declared: " + s.name);
            } else if (s.kind == St::Assign) {
                auto* old = lookup(frame, s.name);
                if (!old)
                    tiny::fail(p.source, s.at, "assignment before let: " + s.name);
                *old = v;
            } else if (s.kind == St::Branch) {
                const auto* branch = &s.no;
                if (logical(v, p.source, s.at))
                    branch = &s.yes;
                frame.locals.emplace_back();
                auto returned = execute(*branch, frame);
                frame.locals.pop_back();
                if (returned)
                    return returned;
            }
        }
        return std::nullopt;
    }

    // [/snippet run-block]
    public:
    Machine(const Program& program, Names& variables, Host& buffer)
        : p(program), global(variables), host(buffer) {}

    void initialize() {
        Frame frame;
        frame.topLevel = true;
        execute(p.initializers, frame);
    }

    // [snippet call-frame]
    Value call(const std::string& name, const std::vector<Value>& args, std::size_t at = 0) {
        spend(at);
        if (hostName(name))
            return hostCall(host, name, args, p.source, at);
        const auto fn = p.functions.find(name);
        if (fn == p.functions.end())
            tiny::fail(p.source, at, "unknown function: " + name);
        if (args.size() != fn->second.params.size())
            tiny::fail(p.source, at, "wrong argument count: " + name);
        if (calls >= 16)
            tiny::fail(p.source, at, "call depth exceeds 16: " + name);
        ++calls;
        Frame frame;
        for (std::size_t i = 0; i < args.size(); ++i)
            frame.locals.back()[fn->second.params[i]] = args[i];
        auto returned = execute(fn->second.body, frame);
        --calls;
        if (returned)
            return *returned;
        return 0.0;
    }

    // [/snippet call-frame]
    unsigned stepsUsed() const {
        return 1024 - budget;
    }
};
#endif
} // namespace ink
