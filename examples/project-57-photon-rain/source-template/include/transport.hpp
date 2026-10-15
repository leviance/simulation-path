#pragma once
#include "geometry.hpp"

namespace photon {
#if LAB_CHECKPOINT >= 5
inline Point scatterDirection(double u) {
    if (!std::isfinite(u) || u <= 0 || u >= 1) {
        throw std::invalid_argument("Invalid scattering sample");
    }
    const double angle = 2 * std::numbers::pi * u;
    return {std::cos(angle), std::sin(angle)};
}
#endif

#if LAB_CHECKPOINT >= 4
// Cập nhật đúng một flight; terminal trace không được tiến thêm lần nữa.
inline void advancePhoton(Photon& value, Random& random, Settings settings, Trace& trace) {
    if (trace.status != Status::Alive) {
        throw std::invalid_argument("Cannot advance a terminal trace");
    }
    const Flight flight = sampleFlight(value, random, settings);
    value.position = flight.endpoint;
    if (flight.escaped) {
        trace.vertices.push_back({value.position, Event::Escape});
        trace.status = Status::Escaped;
        return;
    }
    ++trace.collisions;
#if LAB_CHECKPOINT >= 5
    const double absorptionProbability = settings.muA / (settings.muA + settings.muS);
    if (random.uniform() < absorptionProbability) {
        trace.vertices.push_back({value.position, Event::Absorption});
        trace.status = Status::Absorbed;
        return;
    }
    ++trace.scatters;
    trace.vertices.push_back({value.position, Event::Scatter});
    value.direction = scatterDirection(random.uniform());
#else
    trace.vertices.push_back({value.position, Event::Absorption});
    trace.status = Status::Absorbed;
    return;
#endif
}

inline Trace tracePhoton(Settings settings, int id) {
    validate(settings);
    Random random(photonSeed(settings.seed, id));
    Photon value = launch(random);
    Trace trace;
    trace.vertices.push_back({value.position, Event::Emission});
#if LAB_CHECKPOINT >= 5
    for (int event = 0; event < settings.eventLimit; ++event) {
        advancePhoton(value, random, settings, trace);
        if (trace.status != Status::Alive) {
            return trace;
        }
    }
    // Chạm ngân sách không cho biết photon sẽ hấp thụ hay thoát sau đó.
    trace.status = Status::Censored;
#else
    advancePhoton(value, random, settings, trace);
#endif
    return trace;
}
#endif
} // namespace photon
