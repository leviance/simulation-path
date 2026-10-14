#pragma once
#include "vector.hpp"

namespace picking {
// Geometry is independent of SDL and can be tested without a window.
struct Plane {
    Vec3 point{0, -1, 0};
    Vec3 normal{0, 1, 0};
};

struct Sphere {
    Vec3 center{-1.5, 0, 0};
    double radius = 0.85;
};

struct Box {
    Vec3 minimum{0.3, -0.9, 0};
    Vec3 maximum{1.7, 0.7, 1.4};
};

struct Triangle {
    Vec3 a{-0.9, -0.6, 2.5};
    Vec3 b{1, -0.6, 2.5};
    Vec3 c{0.1, 1.3, 2.5};
};

struct Scene {
    Plane plane;
    Sphere sphere;
    Box box;
    Triangle triangle;
};
} // namespace picking
