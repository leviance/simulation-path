#pragma once
#include "flex/workshop.hpp"

namespace tiny {
enum class Topic { Click,
                   Input,
                   Change };

struct Signal {
    Topic type;
    lab::WidgetId target = 0, current = 0;
    double value = 0;
    bool handled = false, stopped = false;
    bool stopAtGroup = false;
    unsigned commands = 0, groups = 0;
};

using Callback = std::function<void(Desk&, Signal&)>;

// [snippet lookup]
inline lab::WidgetId elementById(const Page& page, const std::string& name) {
    const auto found = page.document.byId.find(name);
    if (found == page.document.byId.end())
        return 0;
    return page.handles.at(static_cast<std::size_t>(found->second));
}

// [/snippet lookup]

struct Bus {
    std::map<std::pair<lab::WidgetId, Topic>, Callback> listeners;
    std::vector<std::string> route;
    unsigned edition = 0, emitted = 0, commands = 0, ancestorCalls = 0;
    bool stopAtGroup = false;

    bool on(const Page& p, const std::string& name, Topic topic, Callback action) {
        const auto id = elementById(p, name);
        if (!id || !action)
            return false;
        return listeners.emplace(std::make_pair(id, topic), std::move(action)).second;
    }
};

// [snippet dispatch]
inline bool dispatch(Desk& d, Bus& bus, Signal event) {
    bus.route.clear();
    const auto pos = d.page.elements.find(event.target);
    if (bus.edition != d.edition || pos == d.page.elements.end())
        return false;
    int index = static_cast<int>(pos->second);
    event.stopAtGroup = bus.stopAtGroup;
    ++bus.emitted;
    while (index >= 0) {
        const auto i = static_cast<std::size_t>(index);
        const auto& element = d.page.document.elements[i];
        event.current = d.page.handles[i];
        bus.route.push_back(element.id);
        const auto it = bus.listeners.find({event.current, event.type});
        if (it != bus.listeners.end())
            it->second(d, event);
#if LAB_CHECKPOINT >= 7102
        if (event.stopped)
            break;
        index = element.parent;
#else
        break;
#endif
    }
    bus.commands += event.commands;
    bus.ancestorCalls += event.groups;
    return event.handled;
}

// [/snippet dispatch]
} // namespace tiny
