#pragma once

#include <chrono>
#include <stdexcept>

namespace sculpt {

// Human pause time is not working time. In-flight GPU fences still keep their own wall deadline.
class ActiveDeadline {
    public:
    using Clock = std::chrono::steady_clock;

    explicit ActiveDeadline(Clock::duration limit, Clock::time_point start = Clock::now())
        : limit_(limit), last_(start) {
        if (limit <= Clock::duration::zero())
            throw std::invalid_argument("A work deadline must have a positive finite duration");
    }

    void pause(bool value, Clock::time_point now = Clock::now()) {
        advance(now);
        paused_ = value;
    }

    bool expired(Clock::time_point now = Clock::now()) {
        advance(now);
        return active_ >= limit_;
    }

    private:
    void advance(Clock::time_point now) {
        if (now < last_)
            throw std::invalid_argument("A work deadline requires a monotonic clock");
        if (!paused_)
            active_ += now - last_;
        last_ = now;
    }

    Clock::duration limit_, active_{};
    Clock::time_point last_;
    bool paused_{};
};

} // namespace sculpt
