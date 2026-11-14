// Supplied normalized hydrogen functions in units a0=1. Original implementation;
// formulas: OpenStax 8.1 and NIST DLMF 18.39.37. Real basis, not extra electrons.
const float atomPi = 3.14159265358979323846;

float orbitalRadial(uint id, float r) {
    if (id >= 10u)
        return 1.0;
    if (id == 0u)
        return 2.0 * exp(-r);
    if (id == 1u)
        return (2.0-r) * exp(-r*0.5) / (2.0*sqrt(2.0));
    if (id <= 4u)
        return r * exp(-r*0.5) / (2.0*sqrt(6.0));
    if (id <= 7u)
        return 4.0 * r*r * exp(-r/3.0) / (81.0*sqrt(30.0));
    return r*r*r * exp(-r*0.25) / (768.0*sqrt(35.0));
}

float orbitalAngular(uint id, vec3 direction) {
    float x=direction.x, y=direction.y, z=direction.z;
    if (id == 0u || id == 1u || id == 10u)
        return inversesqrt(4.0*atomPi);
    if (id == 2u) return sqrt(3.0/(4.0*atomPi))*x;
    if (id == 3u) return sqrt(3.0/(4.0*atomPi))*y;
    if (id == 4u) return sqrt(3.0/(4.0*atomPi))*z;
    if (id == 5u) return sqrt(5.0/(16.0*atomPi))*(3.0*z*z-1.0);
    if (id == 6u) return sqrt(15.0/(4.0*atomPi))*x*y;
    if (id == 7u) return sqrt(15.0/(16.0*atomPi))*(x*x-y*y);
    if (id == 8u) return sqrt(7.0/(16.0*atomPi))*z*(5.0*z*z-3.0);
    if (id == 9u) return sqrt(105.0/(4.0*atomPi))*x*y*z;
    return sqrt(max(0.0,1.0+0.6*z)/(4.0*atomPi));
}

// Return density and the sign of the real amplitude. Sign is a display channel,
// never a negative probability or a velocity.
vec2 orbitalDensity(uint id, vec3 point) {
    float r=length(point);
    if (r==0.0 && id>=2u && id<=9u)
        return vec2(0.0);
    vec3 direction=vec3(0,0,1);
    if (r>0.0)
        direction=point/r;
    float amplitude=orbitalRadial(id,r)*orbitalAngular(id,direction);
    return vec2(amplitude*amplitude,sign(amplitude));
}

vec2 orbitalDensity(int id, vec3 point) {
    return orbitalDensity(uint(id),point);
}
