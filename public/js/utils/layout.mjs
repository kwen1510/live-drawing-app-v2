function toPositiveNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return parsed;
}

function toNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return parsed;
}

/**
 * Calculates the placement for the teacher overlay canvas so that it exactly
 * matches the visible student canvas within its padded container.
 *
 * @param {object} options - Measurement values for the container and canvas.
 * @param {number} options.containerWidth - Full width of the container in pixels.
 * @param {number} options.containerHeight - Full height of the container in pixels.
 * @param {number} options.paddingLeft - Left padding of the container in pixels.
 * @param {number} options.paddingRight - Right padding of the container in pixels.
 * @param {number} options.paddingTop - Top padding of the container in pixels.
 * @param {number} options.paddingBottom - Bottom padding of the container in pixels.
 * @param {number} options.drawWidth - The rendered width of the student canvas.
 * @param {number} options.drawHeight - The rendered height of the student canvas.
 * @returns {{width: number, height: number, left: number, top: number}}
 */
export function calculateOverlayPlacement(options = {}) {
    const containerWidth = toPositiveNumber(options.containerWidth);
    const containerHeight = toPositiveNumber(options.containerHeight);

    if (containerWidth === 0 || containerHeight === 0) {
        return { width: 0, height: 0, left: 0, top: 0 };
    }

    const paddingLeft = Math.max(0, toNumber(options.paddingLeft));
    const paddingRight = Math.max(0, toNumber(options.paddingRight));
    const paddingTop = Math.max(0, toNumber(options.paddingTop));
    const paddingBottom = Math.max(0, toNumber(options.paddingBottom));

    const innerWidth = Math.max(0, containerWidth - paddingLeft - paddingRight);
    const innerHeight = Math.max(0, containerHeight - paddingTop - paddingBottom);

    const drawWidth = Math.min(innerWidth, Math.max(0, toPositiveNumber(options.drawWidth)));
    const drawHeight = Math.min(innerHeight, Math.max(0, toPositiveNumber(options.drawHeight)));

    const leftoverWidth = Math.max(0, innerWidth - drawWidth);
    const leftoverHeight = Math.max(0, innerHeight - drawHeight);

    const left = paddingLeft + leftoverWidth / 2;
    const top = paddingTop + leftoverHeight / 2;

    return {
        width: drawWidth,
        height: drawHeight,
        left,
        top
    };
}

