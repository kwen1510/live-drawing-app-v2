import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateOverlayPlacement } from '../public/js/utils/layout.mjs';

test('centres overlay within padded container', () => {
    const layout = calculateOverlayPlacement({
        containerWidth: 1280,
        containerHeight: 900,
        paddingLeft: 60,
        paddingRight: 60,
        paddingTop: 40,
        paddingBottom: 40,
        drawWidth: 800,
        drawHeight: 600
    });

    assert.equal(layout.width, 800);
    assert.equal(layout.height, 600);
    assert.equal(layout.left, 60 + (1160 - 800) / 2);
    assert.equal(layout.top, 40 + (820 - 600) / 2);
});

test('clamps overlay to available space when draw size is larger than container', () => {
    const layout = calculateOverlayPlacement({
        containerWidth: 600,
        containerHeight: 500,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
        drawWidth: 1200,
        drawHeight: 900
    });

    assert.equal(layout.width, 560);
    assert.equal(layout.height, 480);
    assert.equal(layout.left, 20);
    assert.equal(layout.top, 10);
});

test('returns zeroed layout when container measurements are invalid', () => {
    const layout = calculateOverlayPlacement({
        containerWidth: 0,
        containerHeight: -10,
        drawWidth: 500,
        drawHeight: 400
    });

    assert.deepEqual(layout, { width: 0, height: 0, left: 0, top: 0 });
});
