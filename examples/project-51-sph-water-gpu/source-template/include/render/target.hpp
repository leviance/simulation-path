#pragma once
#include "gpu/api.hpp"

namespace water51 {
// Own a floating-point render target with an optional depth attachment.

class Target {
    Gl& gl_;

    public:
    GLuint texture = 0;
    GLuint framebuffer = 0;
    GLuint depth = 0;

    Target(Gl& gl, int width, int height, bool depthBuffer, bool packedSurface = false)
        : gl_(gl) {
        gl_.GenTextures(1, &texture);
        gl_.BindTexture(GL_TEXTURE_2D, texture);
        GLint storage = GL_R32F;
        GLenum channels = GL_RED;
        if (packedSurface) {
            // Depth and optical thickness travel through the same reconstruction filter.
            storage = GL_RG32F;
            channels = GL_RG;
        }
        gl_.TexImage2D(GL_TEXTURE_2D, 0, storage, width, height, 0, channels, GL_FLOAT, nullptr);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        gl_.GenFramebuffers(1, &framebuffer);
        gl_.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        gl_.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
        if (depthBuffer) {
            gl_.GenRenderbuffers(1, &depth);
            gl_.BindRenderbuffer(GL_RENDERBUFFER, depth);
            gl_.RenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, width, height);
            gl_.FramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, depth);
        }
        if (gl_.CheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE)
            throw std::runtime_error("Incomplete water framebuffer");
    }

    ~Target() {
        if (depth)
            gl_.DeleteRenderbuffers(1, &depth);
        gl_.DeleteFramebuffers(1, &framebuffer);
        gl_.DeleteTextures(1, &texture);
    }

    Target(const Target&) = delete;

    void bind() {
        gl_.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    }

    void sample(GLuint unit) {
        gl_.ActiveTexture(GL_TEXTURE0 + unit);
        gl_.BindTexture(GL_TEXTURE_2D, texture);
    }
};
} // namespace water51
