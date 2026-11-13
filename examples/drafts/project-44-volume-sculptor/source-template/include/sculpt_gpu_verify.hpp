#pragma once

#include "sculpt_gpu_mesh.hpp"
#include <iostream>

namespace sculpt {

inline void verifyGpuShape(const GpuMeshBuilder& model, bool plane) {
    if (!model.ready() || !model.guardsIntact())
        throw std::runtime_error("Verification requires a complete mesh and intact canaries");
    const auto& spec = model.settings().grid;
    double worstFieldError = 0;
    const Vec3 planeNormal = normalized({1,2,-1});
    for (std::size_t first = 0; first < spec.sampleCount(); first += 65536) {
        const auto values = model.readField(first,std::min<std::size_t>(65536,spec.sampleCount()-first));
        for (std::size_t local = 0; local < values.size(); ++local) {
            const auto id = first + local;
            const int x = static_cast<int>(id % spec.samples), y = static_cast<int>((id / spec.samples) % spec.samples), z = static_cast<int>(id / (spec.samples * spec.samples));
            const auto p = spec.worldFromGrid({static_cast<float>(x),static_cast<float>(y),static_cast<float>(z)});
            double expected = std::sqrt(static_cast<double>(p.x)*p.x+static_cast<double>(p.y)*p.y+static_cast<double>(p.z)*p.z)-0.82;
            if (plane)
                expected = static_cast<double>(p.x)*planeNormal.x+static_cast<double>(p.y)*planeNormal.y+static_cast<double>(p.z)*planeNormal.z-0.13;
            if (!std::isfinite(values[local]) || std::abs(values[local]-expected) > 0.000004)
                throw std::runtime_error("GPU scalar sample differs from independent analytic field");
            worstFieldError = std::max(worstFieldError,std::abs(values[local]-expected));
        }
    }
    std::uint64_t vertices=0,activeCells=0,fallbacks=0;
    double errorSum=0,maximumError=0;
    for (std::size_t chunk=0;chunk<model.active().size();++chunk) {
        const auto& stats=model.active()[chunk].stats;
        if (stats.emitted!=stats.vertices || stats.invalid || stats.mismatch || stats.generation!=model.activeGeneration())
            throw std::runtime_error("Chunk output counts or generation do not match ACTIVE");
        activeCells+=stats.activeCells;
        fallbacks+=stats.normalFallbacks;
        const auto data=model.readChunk(chunk);
        vertices+=data.size();
        for (const auto& record:data) {
            const auto p=positionOf(record), n=normalOf(record);
            if (!finite(p)||!finite(n)||std::abs(length(n)-1.0F)>0.0001F||record.position[3]!=1||record.normal[3]!=0)
                throw std::runtime_error("Mesh record has invalid position, normal or packing");
            double error=std::abs(std::sqrt(static_cast<double>(p.x)*p.x+static_cast<double>(p.y)*p.y+static_cast<double>(p.z)*p.z)-(0.82+model.settings().isovalue));
            if (plane)
                error=std::abs(dot(p,planeNormal)-(0.13+model.settings().isovalue));
            const double bound=2.0*spec.spacing()*spec.spacing();
            if (error>bound || (!plane && dot(p,n)/length(p)<0.97F) || (plane && dot(n,planeNormal)<0.999F))
                throw std::runtime_error("GPU isosurface position or outward normal differs from analytic reference");
            errorSum+=error*error;
            maximumError=std::max(maximumError,error);
        }
        for (std::size_t first=0;first<data.size();first+=3) {
            const auto a=positionOf(data[first]),b=positionOf(data[first+1]),c=positionOf(data[first+2]);
            const auto normal=normalOf(data[first])+normalOf(data[first+1])+normalOf(data[first+2]);
            if (dot(cross(b-a,c-a),normal)<-1e-10F)
                throw std::runtime_error("GPU triangle winding disagrees with outward gradient normals");
        }
    }
    if (vertices==0 || vertices!=model.requestedVertices() || vertices%3!=0 || activeCells>spec.cellCount())
        throw std::runtime_error("Count/scan/emit totals do not describe a complete valid mesh");
    const auto& times=model.times();
    std::cout<<"P44 GPU SHAPE PASS samples="<<spec.sampleCount()<<" cells="<<spec.cellCount()<<" activeCells="<<activeCells<<" vertices="<<vertices<<" triangles="<<vertices/3<<" generation="<<model.activeGeneration()<<" fieldMax="<<worstFieldError<<" surfaceRms="<<std::sqrt(errorSum/vertices)<<" surfaceMax="<<maximumError<<" normalFallbacks="<<fallbacks<<" canaries=ok\n";
    std::cout<<"GPU MS field="<<times.field<<" count="<<times.count<<" scan="<<times.scan<<" emit="<<times.emit<<" normals="<<times.normals<<"; draw timing not yet collected\n";
}

} // namespace sculpt
