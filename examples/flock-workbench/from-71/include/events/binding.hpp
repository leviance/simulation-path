#pragma once
#include "bus.hpp"

namespace tiny {
using Command = std::function<void(Desk&, const std::string&, double)>;

// [snippet host-binding]
inline void hostCommand(Desk& d, const std::string& name, double value) {
    if (name == "pause")
        lab::setPaused(d.model, !d.model.paused);
    if (name == "reset")
        lab::resetSimulation(d.model);
    if (name == "observe")
        d.model.colony.showNeighbors = !d.model.colony.showNeighbors;
    if (name == "radius" || name == "separation")
        applyRange(d, elementById(d.page, name), value);
}

// [/snippet host-binding]

inline void connect(Desk& d, Bus& bus, Command command = hostCommand) {
    bus.listeners.clear();
    bus.route.clear();
    bus.edition = d.edition;
    for (const std::string name : {"pause", "reset", "observe", "radius", "separation"}) {
        Topic topic = Topic::Click;
        if (name == "radius" || name == "separation")
            topic = Topic::Input;
        const auto widget = elementById(d.page, name);
        const auto view = lab::find(*d.page.layout.scene.tree.root, widget);
        if (!view || (topic == Topic::Input && view->kind != lab::Kind::Slider) || (topic == Topic::Click && view->kind != lab::Kind::Button))
            throw Error("missing or incompatible bound control #" + name);
        bus.on(d.page, name, topic, [name, command](Desk& desk, Signal& e) {
            ++e.commands;
            command(desk, name, e.value);
            e.handled = true;
        });
    }
#if LAB_CHECKPOINT >= 7102
    // [snippet bubble-handler]
    bus.on(d.page, "tools", Topic::Click, [](Desk&, Signal& e) {
        ++e.groups;
        if (e.stopAtGroup)
            e.stopped = true;
    });
    // [/snippet bubble-handler]
#endif
}
} // namespace tiny
