#pragma once
#include "gesture.hpp"

namespace tiny {
// [snippet switch-document]
inline bool reloadBound(Desk& live, Palette& paint, FlexState& flex, Bus& bus, const std::filesystem::path& html, const std::filesystem::path& css, Command command = hostCommand) {
    lab::cancel(live.ui);
    try {
        Desk candidate;
        candidate.edition = live.edition;
        candidate.page.layout.width = live.page.layout.width;
        candidate.model.colony.params = live.model.colony.params;
        install(candidate, readFile(html));
        Palette nextPaint;
        nextPaint.defaults = candidate.page.layout.scene.styles;
        FlexState nextFlex;
        if (!changeFlexSheet(candidate, nextPaint, nextFlex, css))
            throw Error(candidate.status);
        Bus next;
        next.stopAtGroup = bus.stopAtGroup;
        connect(candidate, next, std::move(command));
        live.page = std::move(candidate.page);
        live.edition = candidate.edition;
        live.model.colony.params = candidate.model.colony.params;
        live.ui = {};
        live.observed = 0;
        live.name = html.filename().string();
        live.status = live.name + "   /   five controls connected";
        live.error = false;
        paint = std::move(nextPaint);
        flex = std::move(nextFlex);
        bus = std::move(next);
        return true;
    } catch (const std::exception& e) {
        live.error = true;
        live.status = html.filename().string() + ": " + e.what();
        return false;
    }
}

// [/snippet switch-document]
} // namespace tiny
