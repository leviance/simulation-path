#pragma once
#include "machine.hpp"

namespace ink {
struct Session {
    Program program;
    Names variables;
    std::string filename;
    std::string message;
    unsigned edition = 0, steps = 0;
};

inline std::string handler(const std::string& event) {
    if (event == "pause")
        return "onPause";
    if (event == "reset")
        return "onReset";
    if (event == "observe")
        return "onObserve";
    if (event == "radius")
        return "onRadius";
    if (event == "separation")
        return "onSeparation";
    throw tiny::Error("no binding for " + event);
}

// [snippet install-script]
inline bool reload(Session& s, tiny::Desk& d, const std::filesystem::path& file) {
    try {
        const auto text = tiny::readFile(file);
#if LAB_CHECKPOINT >= 7204
        Program next = Parser(text).run();
        for (const auto& [name, fn] : next.functions)
            if (hostName(name))
                tiny::fail(next.source, fn.at, "reserved host name: " + name);
        for (const std::string event : {"pause", "reset", "observe", "radius", "separation"}) {
            const auto name = handler(event);
            const auto fn = next.functions.find(name);
            unsigned n = 0;
            if (event == "radius" || event == "separation")
                n = 1;
            if (fn == next.functions.end())
                tiny::fail(next.source, 0, "missing handler " + name);
            if (fn->second.params.size() != n)
                tiny::fail(next.source, fn->second.at, "wrong handler arity: " + name);
        }
        Host buffer = Host::read(d);
        buffer.writable = false;
        Names vars;
        Machine vm(next, vars, buffer);
        vm.initialize();
        s.program = std::move(next);
        s.variables = std::move(vars);
        ++s.edition;
        s.filename = file.filename().string();
        s.message = "Loaded " + s.filename + "   /   edition " + std::to_string(s.edition);
#elif LAB_CHECKPOINT >= 7203
        auto tree = Parser(text).run();
        s.message = std::to_string(tree.functions.size()) + " functions in the AST; C++ bindings still active";
#elif LAB_CHECKPOINT >= 7202
        s.message = std::to_string(lex(text).size() - 1) + " script tokens; C++ bindings still active";
#else
        s.message = std::to_string(text.size()) + " script bytes; C++ bindings still active";
#endif
        d.error = false;
        d.status = s.message;
        return true;
    } catch (const std::exception& e) {
        s.message = file.filename().string() + ":" + e.what();
        d.error = true;
        d.status = s.message;
        return false;
    }
}

// [/snippet install-script]

#if LAB_CHECKPOINT >= 7205
// [snippet atomic-event]
inline bool invoke(Session& s, tiny::Desk& d, const std::string& event, double proposal = 0) {
    try {
        Names vars = s.variables;
        Host buffer = Host::read(d);
        Machine vm(s.program, vars, buffer);
        std::vector<Value> args;
        if (event == "radius" || event == "separation")
            args.push_back(proposal);
        vm.call(handler(event), args);
        buffer.publish(d);
        // Giữ tay kéo ở giá trị đề xuất. Nhãn Radius/Separation đọc kết quả thật của script.
        if (event == "radius" || event == "separation")
            d.page.values.at(tiny::elementById(d.page, event)) = proposal;
        if (event == "reset") {
            d.page.values.at(tiny::elementById(d.page, "radius")) = buffer.radius;
            d.page.values.at(tiny::elementById(d.page, "separation")) = buffer.separation;
        }
        s.variables = std::move(vars);
        s.steps = vm.stepsUsed();
        s.message = s.filename + " : " + handler(event) + "   /   " + std::to_string(s.steps) + " steps";
        if (event == "radius")
            s.message += "   input " + std::to_string(int(proposal)) + " -> " + std::to_string(int(buffer.radius)) + " px";
        d.error = false;
        d.status = s.message;
        return true;
    } catch (const std::exception& e) {
        s.message = s.filename + " " + handler(event) + ": " + e.what();
        d.error = true;
        d.status = s.message;
        return false;
    }
}

// [/snippet atomic-event]
#endif
} // namespace ink
