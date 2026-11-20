#pragma once
#include "events/binding.hpp"
#include "parse.hpp"

namespace ink {
using Names = std::map<std::string, Value>;

inline double numeric(const Value& v, std::string_view source, std::size_t at) {
    if (!std::holds_alternative<double>(v))
        tiny::fail(source, at, "number required");
    return std::get<double>(v);
}

inline bool logical(const Value& v, std::string_view source, std::size_t at) {
    if (!std::holds_alternative<bool>(v))
        tiny::fail(source, at, "boolean required");
    return std::get<bool>(v);
}

struct Host {
    double radius = 64, separation = 1.5;
    bool paused = false, visible = true, reset = false, writable = true;

    static Host read(const tiny::Desk& d) {
        return {d.model.colony.params.radius, d.model.colony.params.separationWeight, d.model.paused, d.model.colony.showNeighbors, false, true};
    }

    // [snippet apply-host]
    void publish(tiny::Desk& d) const {
        if (reset)
            lab::resetSimulation(d.model);
        lab::setPaused(d.model, paused);
        d.model.colony.params.radius = radius;
        d.model.colony.params.separationWeight = separation;
        d.model.colony.showNeighbors = visible;
    }

    // [/snippet apply-host]
};

inline bool hostName(std::string_view id) {
    static const std::set<std::string_view> list{"paused", "getRadius", "getSeparation", "showLinks", "pause", "resume", "reset", "radius", "separate", "links"};
    return list.contains(id);
}

// [snippet allowed-host]
inline Value hostCall(Host& h, const std::string& id, const std::vector<Value>& args, std::string_view source, std::size_t at) {
    unsigned expected = 0;
    if (id == "radius" || id == "separate" || id == "links")
        expected = 1;
    if (!hostName(id) || args.size() != expected)
        tiny::fail(source, at, "unknown host or wrong arity: " + id);
    if (id == "paused")
        return h.paused;
    if (id == "getRadius")
        return h.radius;
    if (id == "getSeparation")
        return h.separation;
    if (id == "showLinks")
        return h.visible;
    if (!h.writable)
        tiny::fail(source, at, "host writes only inside handlers");
    if (id == "pause")
        h.paused = true;
    if (id == "resume")
        h.paused = false;
    if (id == "reset") {
        h.reset = true;
        h.radius = 64;
        h.separation = 1.5;
        h.visible = true;
    }
    if (id == "links")
        h.visible = logical(args[0], source, at);
    if (id == "radius" || id == "separate") {
        const double value = numeric(args[0], source, at);
        if (id == "radius") {
            if (value < 20 || value > 140)
                tiny::fail(source, at, "radius outside 20..140");
            h.radius = value;
        } else {
            if (value < 0 || value > 5)
                tiny::fail(source, at, "separation outside 0..5");
            h.separation = value;
        }
    }
    return 0.0;
}

// [/snippet allowed-host]
} // namespace ink
