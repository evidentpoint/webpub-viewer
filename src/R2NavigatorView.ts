import {
  Publication,
  IFrameLoader,
  R2ContentViewFactory,
  RenditionContext as R2RenditionContext,
  Rendition,
  SpreadMode,
} from '@evidentpoint/r2-navigator-web';

export class R2NavigatorView {
  private rendCtx: R2RenditionContext;

  public async loadPublication(pubUrl: string, root: HTMLElement): Promise<R2RenditionContext> {
    const publication: Publication = await Publication.fromURL(pubUrl);
    const loader = new IFrameLoader(publication.getBaseURI());
    loader.setReadiumCssBasePath('/readerJBKS/readium-css');
    const cvf = new R2ContentViewFactory(loader);
    const rendition = new Rendition(publication, root, cvf);
    rendition.setViewAsVertical(false);

    // Get available width
    const availableWidth = this.getAvailableWidth();

    // Get height for the iframes
    const availableHeight = this.getAvailableHeight();

    rendition.viewport.setViewportSize(availableWidth, availableHeight);
    rendition.viewport.setPrefetchSize(Math.ceil(availableWidth * 0.1));
    rendition.setPageLayout({
        spreadMode: SpreadMode.FitViewportDoubleSpread,
        pageWidth: 0,
        pageHeight: 0,
    });
    await rendition.render();
    rendition.viewport.enableScroll(false);
    
    this.rendCtx = new R2RenditionContext(rendition, loader);
    await this.rendCtx.navigator.gotoBegin();

    return this.rendCtx;
  }

  // Get available height for iframe container to sit within
  private getAvailableHeight(): number {
    const topBar = document.getElementById('top-control-bar');
    let topHeight = 0;
    if (topBar) {
        const topRect = topBar.getBoundingClientRect();
        topHeight = topRect.height;
    }
    const bottomBar = document.getElementById('bottom-control-bar');
    let bottomHeight = 0;
    if (bottomBar) {
        const bottomRect = bottomBar.getBoundingClientRect();
        bottomHeight = bottomRect.height;
    }

    return window.innerHeight - topHeight - bottomHeight;
  }

  // Get available width for iframe container to sit within
  private getAvailableWidth(): number {
      const prevBtn = document.getElementById('prev-page-btn');
      let prevBtnWidth = 0;
      if (prevBtn) {
          const rect = prevBtn.getBoundingClientRect();
          prevBtnWidth = rect.width;
      }
      const nextBtn = document.getElementById('next-page-btn');
      let nextBtnWidth = 0;
      if (nextBtn) {
          const rect = nextBtn.getBoundingClientRect();
          nextBtnWidth = rect.width;
      }

      return window.innerWidth - prevBtnWidth - nextBtnWidth;
  }
}