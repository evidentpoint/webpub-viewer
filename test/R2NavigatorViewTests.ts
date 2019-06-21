import { expect } from "chai";
import { stub } from "sinon";

import {
    Publication,
    Rendition,
    Navigator,
} from '@readium/navigator-web';

import { Highlighting } from "@evidentpoint/readium-glue-modules";

import { R2NavigatorView } from "../src/R2NavigatorView";
import { ColumnSettings } from "../src/BookSettings";
import * as sinon from "sinon";

describe('R2NavigatorView', () => {
    // @ts-ignore
    let navView: R2NavigatorView;
    let handleKeyboardNavigation: sinon.SinonStub;
    let rendCtx: any;
    let pageTitleTocResolver: any;
    let locationChanges: Map<string, any> = new Map();

    const setLocationProperty = (property: string, val: any) => {
        if (!locationChanges.has(property)) {
            locationChanges.set(property, {
                prop: property,
                new: val,
                // @ts-ignore
                old: window.location[property],
            });
        } else {
            const savedProp = locationChanges.get(property);
            savedProp.new = val;
        }

        Object.defineProperty(window.location, property, {
            value: val,
            enumerable: true,
            configurable: true,
        });
    };

    const resetLocation = () => {
        locationChanges.forEach((savedProp) => {
            setLocationProperty(savedProp.prop, savedProp.old);
        });
        locationChanges.clear();
    };

    beforeEach(() => {
        resetLocation();
        const iframeContainer = document.createElement('div');
        iframeContainer.setAttribute('id', 'iframe-container');
        document.body.appendChild(iframeContainer);

        handleKeyboardNavigation = stub();

        navView = new R2NavigatorView({
            viewAsVertical: false,
            enableScroll: false,
            columnLayout: ColumnSettings.TwoColumn,
            keyboardCb: handleKeyboardNavigation,
            keys: [],
        });
        rendCtx = {
            // @ts-ignore
            navigator: {
                getCurrentLocationAsync: stub(),
                getScreenBegin: stub(),
                getScreenEnd: stub(),
                nextScreen: stub(),
                previousScreen: stub(),
                gotoAnchorLocation: stub(),
                gotoLocation: stub(),
                gotoBegin: stub(),
                ensureLoaded: stub(),
            },
            rendition: {
                isVerticalLayout: stub(),
                viewport: {
                    addLocationChangedListener: stub(),
                    setScrollMode: stub(),
                },
                render: stub(),
                getPublication: stub(),
                updateViewSettings: stub(),
                viewSettings: stub(),
                setViewAsVertical: stub(),
            }
        }
        rendCtx.rendition.viewSettings.returns({
            getSetting: stub(),
        });
        pageTitleTocResolver = {
            getTocLinkFromLocation: stub(),
            getPageTitleFromLocation: stub(),
            getVisiblePageBreaks: stub(),
        }

        navView.rendCtx = rendCtx;
        // @ts-ignore
        navView.pageTitleTocResolver = pageTitleTocResolver;
    });

    describe('isVerticalLayout', () => {
        it('should return a boolean', () => {
            rendCtx.rendition.isVerticalLayout.returns(true);

            const isVertical = navView.isVerticalLayout();

            expect(isVertical).to.equal(true);
        });
    });

    describe('getShareLink', () => {
        it('should return a full url along with the page href and cfi', async () => {
            rendCtx.navigator.getCurrentLocationAsync.resolves({
                getHref: () => {return 'index.html'},
                getLocation: () => {return '/4/4'},
                getLocationPrecision: () => {return true},
            });
            setLocationProperty('href', 'example.com');
            const shareLink = await navView.getShareLink();

            expect(shareLink).to.include('example.com');
            expect(shareLink).to.include('href=index.html');
            expect(shareLink).to.include('cfi=/4/4');
        });
    });

    describe('addLocationChangedListener', () => {
        it(`should call viewport's method`, () => {
            const func = () => {};
            navView.addLocationChangedListener(func);

            const stub = rendCtx.rendition.viewport.addLocationChangedListener;
            const arg = stub.getCall(0).args[0];

            expect(stub.callCount).to.equal(1);
            expect(arg).to.deep.equal(func);
        });
    });

    describe('addHoverLeftListener', () => {
        const func = () => {};
        const settings = {
            width: 50,
            height: 80,
        };
        it('should set a callback method', () => {
            navView.addHoverLeftListener(func, settings);

            // @ts-ignore
            expect(navView.onHoverLeftCb).to.equal(func);
        });
        it('should set custom sizes', () => {
            navView.addHoverLeftListener(func, settings);

            // @ts-ignore
            expect(navView.customLeftHoverSize.width).to.equal(settings.width);
            // @ts-ignore
            expect(navView.customLeftHoverSize.height).to.equal(settings.height);
        });
    });

    describe('addHoverRightListener', () => {
        const func = () => {};
        const settings = {
            width: 50,
            height: 80,
        };
        it('should set a callback method', () => {
            navView.addHoverRightListener(func, settings);

            // @ts-ignore
            expect(navView.onHoverRightCb).to.equal(func);
        });
        it('should set custom sizes', () => {
            navView.addHoverRightListener(func, settings);

            // @ts-ignore
            expect(navView.customRightHoverSize.width).to.equal(settings.width);
            // @ts-ignore
            expect(navView.customRightHoverSize.height).to.equal(settings.height);
        });
    });

    describe('getChapterInfo', () => {
        beforeEach(() => {
            rendCtx.rendition.getPublication.returns({
                toc: [{
                    title: 'chapter 1',
                    href: 'chap1.html',
                }],
            });
            rendCtx.navigator.getCurrentLocationAsync.resolves({});
        });

        it('should return title and href (current location)', async () => {
            pageTitleTocResolver.getTocLinkFromLocation.returns({
                title: 'chapter 3',
                href: 'chap3.html',
            });

            const chapInfo = await navView.getChapterInfo();

            expect(chapInfo.title).to.equal('chapter 3');
            expect(chapInfo.href).to.equal('chap3.html');
        });

        it('should return title and href (unknown current location)', async () => {
            pageTitleTocResolver.getTocLinkFromLocation.returns(null);

            const chapInfo = await navView.getChapterInfo();

            expect(chapInfo.title).to.equal('chapter 1');
            expect(chapInfo.href).to.equal('chap1.html');
        });
    });

    describe('getLastPageTitle', () => {
        it('should return the last page title', () => {
            rendCtx.rendition.getPublication.returns({
                pageList: [
                    {title: ''},
                    {title: 'title'},
                ],
            });

            const lastTitle = navView.getLastPageTitle();

            expect(lastTitle).to.equal('title');
        });
    });

    describe('getStartEndPageTitles', () => {
        beforeEach(() => {
            rendCtx.navigator.getScreenBegin.returns('start');
            pageTitleTocResolver.getPageTitleFromLocation.returnsArg(0);
        });
        it('should return a start title', async () => {
            // @ts-ignore
            const title = await navView.getStartEndPageTitles();

            expect(title).to.equal('start');
        });
        it('should append end title with en dash', async () => {
            rendCtx.navigator.getScreenEnd.returns('end');
            const title = await navView.getStartEndPageTitles();

            expect(title).to.be.oneOf(['start&#8211;end', 'start–end']);
        });
    });

    describe('getVisiblePageBreaks', () => {
        it('should call pageTitleTocResolver', async () => {
            const data = [{}];
            pageTitleTocResolver.getVisiblePageBreaks.returns(data);

            const pageBreaks = await navView.getVisiblePageBreaks();

            expect(pageBreaks).to.deep.equal(data);
        });
    });

    describe('updateFont', () => {
        it('should allow publisher font', () => {
            navView.updateFont('publisher-font');

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            settings.forEach((setting: any) => {
                // Should send two settings
                expect(setting.name).to.be.oneOf(['font-family', 'font-override']);

                if (setting.name === 'font-override') {
                    expect(setting.value).to.equal('readium-font-off');
                }
                if (setting.name === 'font-family') {
                    // Value should be wrapped in a var tag
                    expect(setting.value).to.include('var');
                }
            });
        });
        it('should support serif-font', () => {
            navView.updateFont('serif-font');

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            settings.forEach((setting: any) => {
                // Should send two settings
                expect(setting.name).to.be.oneOf(['font-family', 'font-override']);

                if (setting.name === 'font-override') {
                    expect(setting.value).to.equal('readium-font-on');
                }
                if (setting.name === 'font-family') {
                    // Value should be wrapped in a var tag
                    expect(setting.value).to.include('var');
                }
            });
        });
        it('should support sans-font', () => {
            navView.updateFont('sans-font');

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            settings.forEach((setting: any) => {
                // Should send two settings
                expect(setting.name).to.be.oneOf(['font-family', 'font-override']);

                if (setting.name === 'font-override') {
                    expect(setting.value).to.equal('readium-font-on');
                }
                if (setting.name === 'font-family') {
                    // Value should be wrapped in a var tag
                    expect(setting.value).to.include('var');
                }
            });
        });
    });

    describe('updateFontSize', () => {
        it('should pass settings to rendition', () => {
            navView.updateFontSize(5);

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            expect(settings[0].name).to.equal('font-size');
        });
    });

    describe('updateLineHeight', () => {
        it('should pass settings to rendition', () => {
            navView.updateLineHeight(5);

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            expect(settings[0].name).to.equal('line-height');
        });
    });

    describe('updateFontSize', () => {
        it('should pass settings to rendition', () => {
            navView.updateFontSize(5);
            rendCtx.rendition.viewSettings.returns({
                getSetting: stub().returns(false),
            });

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            expect(settings[0].name).to.equal('font-size');
        });
    });

    describe('updateTextAlign', () => {
        it('should pass settings to rendition', () => {
            navView.updateTextAlign('justify');
            rendCtx.rendition.viewSettings.returns({
                getSetting: stub().returns(false),
            });

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            expect(settings[0].name).to.equal('text-align');
        });
    });

    describe('updateTheme', () => {
        it('should pass settings to rendition', () => {
            navView.updateTheme('night-theme');

            expect(rendCtx.rendition.updateViewSettings.callCount).to.equal(1);
            const settings = rendCtx.rendition.updateViewSettings.getCall(0).args[0];
            expect(settings[0].name).to.equal('reading-mode');
        });
    });

    describe('nextScreen', () => {
        it('should call navigator.nextScreen', () => {
            navView.nextScreen();

            expect(rendCtx.navigator.nextScreen.callCount).to.equal(1);
        });
        it('should be cancealable', () => {
            // @ts-ignore
            navView.preventPageChange = true;
            navView.nextScreen();

            expect(rendCtx.navigator.nextScreen.callCount).to.equal(0);
        });
    });

    describe('previousScreen', () => {
        it('should call navigator.previousScreen', () => {
            navView.previousScreen();

            expect(rendCtx.navigator.previousScreen.callCount).to.equal(1);
        });
        it('should be cancealable', () => {
            // @ts-ignore
            navView.preventPageChange = true;
            navView.previousScreen();

            expect(rendCtx.navigator.previousScreen.callCount).to.equal(0);
        });
    });

    describe('goToHrefLocation', () => {
        let clock: any;
        beforeEach(() => {
            rendCtx.rendition.getPublication.returns({
                getHrefRelativeToManifest: stub().returns('booklocation.html')
            });
            // Public method, will be tested in a later test case
            // Just need to know it gets called
            navView.highlightShareLocation = stub();
            clock = sinon.useFakeTimers();
        });
        afterEach(() => {
            clock.restore();
        });
        it('should call navigator.gotoAnchorLocation with href', async () => {
            await navView.goToHrefLocation('domain.com/booklocation.html');
            // @ts-ignore
            const gotoAnchorLocation = rendCtx.navigator.gotoAnchorLocation;
            const args = gotoAnchorLocation.getCall(0).args;

            expect(gotoAnchorLocation.callCount).to.equal(1);
            expect(args[0]).to.equal('booklocation.html');
            expect(args[1]).to.be.empty;
        });
        it('should call navigator.gotoAnchorLocation with href and cfi', async () => {
            await navView.goToHrefLocation('domain.com/booklocation.html', '/4/4');
            // @ts-ignore
            const gotoLocation = rendCtx.navigator.gotoLocation;
            const args = gotoLocation.getCall(0).args;

            expect(gotoLocation.callCount).to.equal(1);
            expect(args[0].href).to.equal('booklocation.html');
            expect(args[0].cfi).to.equal('/4/4');
        });
        it('should highlight the cfi range', async () => {
            await navView.goToHrefLocation('domain.com/booklocation.html', '/4/4');

            // @ts-ignore
            expect(navView.highlightShareLocation.callCount).to.equal(1);
            // @ts-ignore
            let args = navView.highlightShareLocation.getCall(0).args;
            expect(args[0]).to.be.true;

            clock.tick(3001);
            // @ts-ignore
            expect(navView.highlightShareLocation.callCount).to.equal(2);
            // @ts-ignore
            args = navView.highlightShareLocation.getCall(1).args;
            expect(args[0]).to.be.false;
        });
    });

    describe('destroy', () => {
        let viewportRoot: HTMLElement;
        beforeEach(() => {
            // @ts-ignore
            navView.resizer = {
                stopListenResize: stub(),
            };
            // @ts-ignore
            viewportRoot = navView.viewportRoot = document.createElement('div');
        });
        it('should end the resize listener', () => {
            navView.destroy();

            // @ts-ignore
            expect(navView.resizer.stopListenResize.callCount).to.equal(1);
        });
        it('should clear the viewport container', () => {
            viewportRoot.appendChild(document.createElement('div'));
            viewportRoot.appendChild(document.createElement('a'));
            viewportRoot.appendChild(document.createElement('iframe'));

            navView.destroy();
            expect(viewportRoot.hasChildNodes()).to.be.false;
        });
    });

    describe('loadPublication', () => {
        let root: HTMLElement;
        // @ts-ignore
        let rendition: sinon.SinonStubbedInstance<Rendition>;
        // @ts-ignore
        let navigator: sinon.SinonStubbedInstance<Navigator>;
        beforeEach(() => {
            // @ts-ignore
            sinon.stub(Publication, 'fromURL').resolves({
                getBaseURI: stub().returns('example.com'),
            });
            rendition = sinon.stub(Rendition.prototype);
            navigator = sinon.stub(Navigator.prototype);
            root = document.createElement('div');
            navigator.ensureLoaded.resolves();
        });
        it('should call rendition.render', async () => {
            // @ts-ignore
            navView.viewAsVertical = true;

            await navView.loadPublication('example.com', root);

            expect(rendition.render.called).to.equal(true);
        });
    });

    describe('highlightShareLocation', () => {
        // @ts-ignore
        let highlighting: sinon.SinonStubbedInstance<Highlighting>;
        beforeEach(() => {
            Highlighting.prototype.constructor = () => {};
            // @ts-ignore
            let highlight = new Highlighting();
            highlighting = sinon.stub(highlight);
            // @ts-ignore
            navView.hrefToHighlightingMap.set('index.html', highlighting);
        });
        it('should be able to create highlights', async () => {
            rendCtx.navigator.getCurrentLocationAsync.resolves({
                getHref: stub().returns('index.html'),
                getLocation: stub().returns('4/4/'),
                isPrecise: stub(),
            });
            const val = await navView.highlightShareLocation(true);

            expect(highlighting.createHighlight.callCount).to.equal(1);
            expect(highlighting.deleteHighlight.callCount).to.equal(0);
            const args = highlighting.createHighlight.getCall(0).args;
            expect(args[0]).to.equal('4/4/');
            expect(val).to.equal('4/4/');
        });
        it('should be able to delete a highlight', async () => {
            rendCtx.navigator.getCurrentLocationAsync.resolves({
                getHref: stub().returns('index.html'),
                getLocation: stub().returns('4/4/'),
                isPrecise: stub(),
            });
            const val = await navView.highlightShareLocation(false);

            expect(highlighting.deleteHighlight.callCount).to.equal(1);
            expect(highlighting.createHighlight.callCount).to.equal(0);
            const args = highlighting.deleteHighlight.getCall(0).args;
            expect(args[0]).to.equal('4/4/');
            expect(val).to.equal('4/4/');
        });
    });

    describe('goToWindowLocation', () => {
        it ('should pass correct parameters to goToHrefLocation', async () => {
            // @ts-ignore
            const goToHrefLocation = sinon.stub(navView, 'goToHrefLocation');
            setLocationProperty('hash', 'href=ops/xhtml/index.html&cfi=/4/2');
            await navView.goToWindowLocation();

            expect(goToHrefLocation.callCount).to.equal(1);
            const args = goToHrefLocation.getCall(0).args;
            expect(args[0]).to.equal('ops/xhtml/index.html');
            expect(args[1]).to.equal('/4/2');
        });
    });
});
