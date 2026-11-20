#pragma once
#include "bridge.hpp"

namespace tiny {
struct Desk {
    Page page;
    lab::Model model;
    lab::Ui ui;
    std::string name = "panel.html";
    std::string status = "F5 reloads the current file";
    bool inspect = false;
    bool error = false;
    unsigned edition = 0;
    std::size_t observed = 0;
};

#if LAB_CHECKPOINT >= 6804
inline void bindExisting(Page& p, std::string_view source) {
    for (const auto& [id, index] : p.elements) {
        const Element& e = p.document.elements[index];
        auto& node = *lab::find(*p.layout.scene.tree.root, id);
        if (node.kind == lab::Kind::Button) {
            if (e.id == "pause")
                node.action = lab::Action::Pause;
            if (e.id == "reset")
                node.action = lab::Action::Reset;
            if (e.id == "observe")
                node.action = lab::Action::Observe;
        }
        if (node.kind == lab::Kind::Label) {
            if (e.id == "radius-value")
                node.binding = lab::Binding::Radius;
            if (e.id == "separation-value")
                node.binding = lab::Binding::Separation;
            if (e.id == "ticks")
                node.binding = lab::Binding::Time;
        }
        if (e.range && ((e.id == "radius" && (e.range->low < 20 || e.range->high > 140)) || (e.id == "separation" && (e.range->low < 0 || e.range->high > 5))))
            fail(source, e.offset, "range for #" + e.id + " exceeds the flock model");
    }
}

// [snippet replace-page]
inline void install(Desk& desk, std::string_view source) {
    Page draft = build(parse(source), desk.page.layout.width);
    bindExisting(draft, source);
    lab::Ui fresh;
    lab::ensureLayout(draft.layout, fresh);
    // Lần đầu đọc value. Từ lần reload sau chỉ ép tham số hiện tại vào miền mới.
    for (const auto& e : draft.document.elements) {
        if (!e.range)
            continue;
        double* value = nullptr;
        if (e.id == "radius")
            value = &desk.model.colony.params.radius;
        if (e.id == "separation")
            value = &desk.model.colony.params.separationWeight;
        if (value) {
            if (desk.edition == 0)
                *value = e.range->value;
            *value = snap(*e.range, *value);
        }
    }
    desk.page = std::move(draft);
    desk.ui = fresh;
    desk.observed = 0;
    ++desk.edition;
}

// [/snippet replace-page]

// [snippet live-value]
inline void applyRange(Desk& d, lab::WidgetId id, double proposed) {
    const auto found = d.page.elements.find(id);
    if (found == d.page.elements.end())
        return;
    const auto& e = d.page.document.elements[found->second];
    if (!e.range)
        return;
    const double value = snap(*e.range, proposed);
    d.page.values[id] = value;
    if (e.id == "radius")
        d.model.colony.params.radius = value;
    if (e.id == "separation")
        d.model.colony.params.separationWeight = value;
}

// [/snippet live-value]

inline double rangeValue(const Desk& d, lab::WidgetId id) {
#if LAB_CHECKPOINT < 7205
    const auto& e = d.page.document.elements.at(d.page.elements.at(id));
    if (e.id == "radius")
        return d.model.colony.params.radius;
    if (e.id == "separation")
        return d.model.colony.params.separationWeight;
#endif
    return d.page.values.at(id);
}

inline void rangeAt(Desk& d, lab::WidgetId id, double x) {
    const auto hit = lab::locate(d.page.layout.scene.tree, id);
    if (!hit || !hit->enabled || !d.page.values.contains(id))
        return;
    const auto r = *d.page.document.elements[d.page.elements.at(id)].range;
    const auto fraction = std::clamp((x - hit->bounds.x) / hit->bounds.width, 0.0, 1.0);
    applyRange(d, id, r.low + fraction * (r.high - r.low));
}
#endif

// [snippet reload]
inline bool reload(Desk& d, const std::filesystem::path& path) {
    try {
        const auto source = readFile(path);
        checkUtf8(source);
#if LAB_CHECKPOINT >= 6804
        install(d, source);
        d.status = std::to_string(d.page.handles.size()) + " widgets from " + path.filename().string();
#elif LAB_CHECKPOINT >= 6803
        const auto doc = parse(source);
        d.status = std::to_string(doc.elements.size()) + " elements; original layout still active";
#elif LAB_CHECKPOINT >= 6802
        Cursor c{source};
        c.take("\xef\xbb\xbf");
        int count = 0;
        while (next(c).kind != TagToken::End)
            ++count;
        d.status = std::to_string(count) + " tokens; original layout still active";
#else
        d.status = std::to_string(source.size()) + " bytes; original layout still active";
#endif
        d.name = path.filename().string();
        d.error = false;
        return true;
    } catch (const std::exception& e) {
        d.error = true;
        d.status = path.filename().string() + ":" + e.what();
        return false;
    }
}

// [/snippet reload]
} // namespace tiny
