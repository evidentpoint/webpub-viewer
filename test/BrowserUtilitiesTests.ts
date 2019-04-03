import { expect } from "chai";

import * as BrowserUtilities from "../src/BrowserUtilities";

const setProperty = (property: string, val: any) => {
    Object.defineProperty((window as any).HTMLHtmlElement.prototype, property, {
        value: val,
        enumerable: true,
        configurable: true,
    });
}

describe("BrowserUtilities", () => {
    beforeEach(() => {
        (window as any).innerWidth = 50;
        (window as any).innerHeight = 10;
        setProperty('clientWidth', 500);
        setProperty('clientHeight', 800);
    });

    describe("#getWidth", () => {
        it("should return current width", () => {
            expect(BrowserUtilities.getWidth()).to.equal(500);
            debugger;
            setProperty('clientWidth', 100);
            expect(BrowserUtilities.getWidth()).to.equal(100);
        });
    });

    describe("#getHeight", () => {
        it("should return current height", () => {
            expect(BrowserUtilities.getHeight()).to.equal(800);
            setProperty('clientHeight', 100);
            expect(BrowserUtilities.getHeight()).to.equal(100);
        });
    });

    describe("#isZoomed", () => {
        it("should return true if document width differs from window width", () => {
            expect(BrowserUtilities.isZoomed()).to.equal(true);
            setProperty('clientWidth', 50);
            expect(BrowserUtilities.isZoomed()).to.equal(false);
        });
    });
});