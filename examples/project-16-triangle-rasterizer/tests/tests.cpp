#include "lab.hpp"

#include <array>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        std::cout << "PASS: " << label << '\n';
        return;
    }
    std::cerr << "FAIL: " << label << '\n';
    ++failures;
}

bool nearlyEqual(double left, double right, double epsilon = 1e-9) {
    return std::abs(left - right) <= epsilon;
}
} // namespace

int main() {
    // Bounds phải bao hết candidate pixel nhưng không bao giờ vượt framebuffer.
    const lab::Triangle2 clipped{
        {-12.4, 4.2},
        {20.2, -8.0},
        {14.0, 18.8},
    };
    const lab::IntRect clippedBounds = lab::triangleBounds(clipped, 16, 12);
    check(clippedBounds.minX == 0 && clippedBounds.minY == 0, "bounds clamp negative minima");
    check(clippedBounds.maxX == 15 && clippedBounds.maxY == 11, "bounds clamp framebuffer maxima");
    check(lab::candidatePixelCount({2, 3, 5, 7}) == 20, "candidate count includes both ends");

    // Screen Y tăng xuống dưới, vì vậy tam giác nhìn như clockwise có area số dương.
    const lab::Triangle2 positive{
        {0.0, 0.0},
        {4.0, 0.0},
        {0.0, 4.0},
    };
    const lab::Triangle2 negative{positive.a, positive.c, positive.b};
    check(nearlyEqual(lab::signedDoubleArea(positive), 16.0), "signed double area is positive");
    check(lab::classifyWinding(positive) == lab::Winding::Positive, "positive winding classification");
    check(lab::classifyWinding(negative) == lab::Winding::Negative, "negative winding classification");
    check(
        nearlyEqual(lab::signedDoubleArea(lab::normalizePositiveWinding(negative)), 16.0),
        "winding normalization swaps B and C"
    );

    // Coverage lấy mẫu ở tâm pixel và không phụ thuộc thứ tự winding ban đầu.
    const lab::Vec2 center = lab::pixelCenter(1, 1);
    check(nearlyEqual(center.x, 1.5) && nearlyEqual(center.y, 1.5), "pixel center uses half offset");
    const lab::CoverageSample inside = lab::sampleTriangle(
        positive,
        center,
        lab::FillRule::Inclusive
    );
    const lab::CoverageSample reversedInside = lab::sampleTriangle(
        negative,
        center,
        lab::FillRule::Inclusive
    );
    check(inside.inside && reversedInside.inside, "coverage survives reversed winding");
    check(lab::barycentricSumError(inside.barycentric) <= 1e-9, "barycentric weights sum to one");
    check(
        !lab::sampleTriangle(positive, {3.5, 3.5}, lab::FillRule::Inclusive).inside,
        "outside sample is rejected"
    );

    // Raster loop phải duyệt đúng bounding box và callback đúng số pixel được phủ.
    std::vector<lab::Vec2> coveredPixels;
    const lab::RasterStats stats = lab::rasterizeTriangle(
        positive,
        8,
        8,
        lab::FillRule::Inclusive,
        [&](int x, int y, lab::Barycentric weights) {
            static_cast<void>(weights);
            coveredPixels.push_back(lab::pixelCenter(x, y));
        }
    );
    check(stats.testedCount == stats.candidateCount, "raster loop tests every candidate");
    check(stats.coveredCount == coveredPixels.size(), "covered count matches callback count");
    check(stats.coveredCount > 0 && stats.coveredCount < stats.candidateCount, "coverage rejects some bounds pixels");

    const lab::Triangle2 degenerate{
        {1.0, 1.0},
        {3.0, 3.0},
        {5.0, 5.0},
    };
    const lab::RasterStats degenerateStats = lab::rasterizeTriangle(
        degenerate,
        8,
        8,
        lab::FillRule::TopLeft,
        [](int x, int y, lab::Barycentric weights) {
            static_cast<void>(x);
            static_cast<void>(y);
            static_cast<void>(weights);
        }
    );
    check(degenerateStats.degenerate, "collinear triangle is degenerate");
    check(degenerateStats.coveredCount == 0, "degenerate triangle shades no pixel");

    // Hai triangle chung đường chéo: inclusive nhận biên hai lần, top-left nhận đúng một lần.
    const lab::Triangle2 second{
        {4.0, 0.0},
        {4.0, 4.0},
        {0.0, 4.0},
    };
    const lab::Vec2 sharedEdgeSample{2.5, 1.5};
    check(
        lab::sharedEdgeCoverageCount(
            positive,
            second,
            sharedEdgeSample,
            lab::FillRule::Inclusive
        ) == 2,
        "inclusive rule double owns shared edge"
    );
    check(
        lab::sharedEdgeCoverageCount(
            positive,
            second,
            sharedEdgeSample,
            lab::FillRule::TopLeft
        ) == 1,
        "top-left rule gives shared edge one owner"
    );

    // Kiểm tra toàn bộ vùng phủ của quad, thay vì chỉ chọn một sample trên đường chéo.
    const auto rasterizeQuad = [](double offset, bool useAlternativeDiagonal) {
        constexpr int width = 8;
        constexpr int height = 8;
        const std::array<lab::Vec2, 4> corners{{
            {1.0 + offset, 1.0 + offset},
            {6.0 + offset, 1.0 + offset},
            {6.0 + offset, 6.0 + offset},
            {1.0 + offset, 6.0 + offset},
        }};
        std::array<lab::Triangle2, 2> triangles{};
        if (useAlternativeDiagonal) {
            triangles = {{
                {corners[0], corners[1], corners[3]},
                {corners[1], corners[2], corners[3]},
            }};
        } else {
            triangles = {{
                {corners[0], corners[1], corners[2]},
                {corners[0], corners[2], corners[3]},
            }};
        }

        std::vector<int> owners(std::size_t(width * height), 0);
        for (const lab::Triangle2& triangle : triangles) {
            lab::rasterizeTriangle(
                triangle,
                width,
                height,
                lab::FillRule::TopLeft,
                [&](int x, int y, lab::Barycentric) {
                    ++owners[std::size_t(y * width + x)];
                }
            );
        }
        return owners;
    };

    const auto verifyCompleteQuad = [](const std::vector<int>& owners, double offset) {
        bool complete = true;
        for (int y = 0; y < 8; ++y) {
            for (int x = 0; x < 8; ++x) {
                const lab::Vec2 sample = lab::pixelCenter(x, y);
                const bool expected = sample.x >= 1.0 + offset && sample.x < 6.0 + offset &&
                    sample.y >= 1.0 + offset && sample.y < 6.0 + offset;
                const int ownerCount = owners[std::size_t(y * 8 + x)];
                complete = complete && ownerCount == (expected ? 1 : 0);
            }
        }
        return complete;
    };

    const std::vector<int> mainDiagonal = rasterizeQuad(0.0, false);
    const std::vector<int> alternativeDiagonal = rasterizeQuad(0.0, true);
    check(verifyCompleteQuad(mainDiagonal, 0.0), "full quad coverage has no crack or overlap");
    check(mainDiagonal == alternativeDiagonal, "both quad diagonals produce identical coverage");

    const std::vector<int> translatedMain = rasterizeQuad(0.2, false);
    const std::vector<int> translatedAlternative = rasterizeQuad(0.2, true);
    check(
        verifyCompleteQuad(translatedMain, 0.2),
        "subpixel-translated quad still has exactly one owner per interior pixel"
    );
    check(
        translatedMain == translatedAlternative,
        "shared-edge ownership survives subpixel translation and diagonal change"
    );

    // Barycentric weights nội suy đúng màu tại từng vertex.
    const lab::Color red{255, 0, 0, 255};
    const lab::Color green{0, 255, 0, 255};
    const lab::Color blue{0, 0, 255, 255};
    const lab::Color atA = lab::interpolateColor(red, green, blue, {1.0, 0.0, 0.0});
    const lab::Color middle = lab::interpolateColor(red, green, blue, {0.25, 0.25, 0.5});
    check(atA.red == 255 && atA.green == 0 && atA.blue == 0, "vertex A keeps its color");
    check(middle.red == 64 && middle.green == 64 && middle.blue == 128, "color interpolation rounds channels");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 16 validation checks passed\n";
    return EXIT_SUCCESS;
}
