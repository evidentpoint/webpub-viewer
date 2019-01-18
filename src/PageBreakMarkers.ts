import { R2NavigatorView } from "./R2NavigatorView";
import { SimpleNavigatorView } from "./SimpleNavigatorView";
import { PageBreakData } from '@readium/navigator-web';

export class PageBreakMarkers {
    private markerContainerLeft: HTMLDivElement;
    private markerContainerRight: HTMLDivElement;
    private parentContainerLeft: HTMLElement | null;
    private parentContainerRight: HTMLElement | null;
    private viewport: HTMLElement;
    private navView: R2NavigatorView | SimpleNavigatorView;

    constructor(parentContainerLeft: HTMLElement | null, parentContainerRight: HTMLElement | null, viewport: HTMLElement) {
        this.parentContainerLeft = parentContainerLeft;
        this.parentContainerRight = parentContainerRight;
        this.viewport = viewport;

        if (this.parentContainerLeft) {
            this.markerContainerLeft = this.createMarkerContainer();
            this.markerContainerLeft.classList.add('left');
            this.parentContainerLeft.appendChild(this.markerContainerLeft);
        }

        if (this.parentContainerRight) {
            this.markerContainerRight = this.createMarkerContainer();
            this.markerContainerRight.classList.add('right');
            this.parentContainerRight.prepend(this.markerContainerRight);
        }
    }

    public setNavView(navView: R2NavigatorView | SimpleNavigatorView) {
        this.navView = navView;
    }

    public async updatePageBreaks(): Promise<void> {
        const pageBreaks = await this.navView.getVisiblePageBreaks();

        if (!pageBreaks) {
            return;
        }

        this.clearMarkerContainer(this.markerContainerLeft);
        this.clearMarkerContainer(this.markerContainerRight);
        this.populateMarkerContainers(pageBreaks);
    }

    private addMarkerToContainer(pageBreak: PageBreakData, container: HTMLElement): HTMLDivElement {
        const marker = document.createElement('div');
        marker.setAttribute('class', 'page-break-marker');
        marker.textContent = pageBreak.link.title;

        container.appendChild(marker);
        return marker;
    }

    private updateMarkerPosition(pageBreak: PageBreakData, marker: HTMLDivElement, container: HTMLDivElement): void {
        // We just need the top position of the viewport to correctly calculate the marker position
        const vpRect = this.viewport.getBoundingClientRect();
        const vpTop = vpRect.top;
        let posY = pageBreak.rect.top + pageBreak.iframeRect.top - vpTop;
        const markerRect = marker.getBoundingClientRect();

        // Ensure the marker isn't placed outside of the container
        if (container) {
            const contRect = container.getBoundingClientRect();
            if (posY + vpTop < contRect.top) {
                posY = contRect.top - vpTop;
            } else if (posY + markerRect.height + vpTop > contRect.top + contRect.height) {
                posY = contRect.top + contRect.height - markerRect.height - vpTop;
            }
        }

        marker.style.setProperty('top', `${posY}px`);
    }

    private createMarkerContainer(): HTMLDivElement {
        const el = document.createElement('div');
        el.setAttribute('class', 'page-marker-container');

        return el;
    }

    private clearMarkerContainer(container: HTMLDivElement): void {
        while (container.hasChildNodes()) {
            // @ts-ignore
            container.removeChild(container.lastChild);
        }
    }

    private populateMarkerContainers(pageBreaks: PageBreakData[]): void {
        const isVertical = this.navView.isVerticalLayout();

        for (const pageBreak of pageBreaks) {
            if (isVertical || !pageBreak.isOnLeftSide) {
                const marker = this.addMarkerToContainer(pageBreak, this.markerContainerRight);
                this.updateMarkerPosition(pageBreak, marker, this.markerContainerRight);
            } else if (pageBreak.isOnLeftSide) {
                const marker = this.addMarkerToContainer(pageBreak, this.markerContainerLeft);
                this.updateMarkerPosition(pageBreak, marker, this.markerContainerLeft);
            }
        }
    }
}
