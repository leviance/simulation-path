// Included after #version by program.hpp. A single 3D kernel serves density and force.
uniform uint uCount;
uniform uint uSide;
uniform uint uCellsAxis;
uniform float uSpacing;
uniform float uH;
uniform float uMass;
uniform float uC;
uniform float uAlpha;
uniform float uGravity;
uniform int uGrid;
const float PI = 3.141592653589793;
bool bad(vec3 p) { return any(isnan(p)) || any(isinf(p)); }
ivec3 cellOf(vec3 p) { return clamp(ivec3(floor(p/(2.0*uH))),ivec3(0),ivec3(uCellsAxis)-1); }
uint flatten(ivec3 c) { return uint(c.x)+uCellsAxis*(uint(c.y)+uCellsAxis*uint(c.z)); }
bool validCell(ivec3 c) { return all(greaterThanEqual(c,ivec3(0))) && all(lessThan(c,ivec3(uCellsAxis))); }
#if LAB_CHECKPOINT >= 4
float kernel(float r) {
    float q=r/uH;
    float sigma=1.0/(PI*uH*uH*uH);
    if (q>=2.0) return 0.0;
    if (q<1.0) return sigma*(1.0-1.5*q*q+0.75*q*q*q);
    return sigma*0.25*pow(2.0-q,3.0);
}
vec3 gradient(vec3 displacement) {
    float r=length(displacement),q=r/uH;
    if (r==0.0 || q>=2.0) return vec3(0.0);
    float derivative=-0.75*pow(2.0-q,2.0);
    if (q<1.0) derivative=-3.0*q+2.25*q*q;
    return displacement*(derivative/(PI*uH*uH*uH*uH*r));
}
#endif
#if LAB_CHECKPOINT >= 6
float viscosity(vec3 d,vec3 v,float rhoA,float rhoB) {
    float approach=dot(d,v);
    if (approach>=0.0) return 0.0;
    float mu=uH*approach/(dot(d,d)+0.01*uH*uH);
    return -uAlpha*uC*mu/(0.5*(rhoA+rhoB));
}
#endif
