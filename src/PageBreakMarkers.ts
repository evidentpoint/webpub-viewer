import { R2NavigatorView } from "./R2NavigatorView";
import { SimpleNavigatorView } from "./SimpleNavigatorView";
import { PageBreakData } from '@readium/navigator-web';

export class PageBreakMarkers {
    private markerContainerLeft: HTMLDivElement;
    private markerContainerRight: HTMLDivElement;
    private parentContainerLeft: HTMLElement | null;
    private parentContainerRight: HTMLElement | null;
    private prevPageButton: HTMLElement | null;
    private nextPageButton: HTMLElement | null;
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
            this.prevPageButton = document.getElementById('prev-page-btn');
        }

        if (this.parentContainerRight) {
            this.markerContainerRight = this.createMarkerContainer();
            this.markerContainerRight.classList.add('right');
            this.parentContainerRight.prepend(this.markerContainerRight);
            this.nextPageButton = document.getElementById('next-page-btn');
        }
    }

    public setNavView(navView: R2NavigatorView | SimpleNavigatorView) {
        this.navView = navView;
    }

    public async updatePageBreaks(): Promise<void> {
        const vpRect = this.viewport.getBoundingClientRect();
        const pageBreaks = await this.navView.getVisiblePageBreaks(vpRect);

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

    private updateMarkerPosition(pageBreak: PageBreakData, marker: HTMLDivElement, button: HTMLElement): void {
        // We just need the top position of the viewport to correctly calculate the marker position
        const vpRect = this.viewport.getBoundingClientRect();
        const vpTop = vpRect.top;
        let posY = pageBreak.rect.top + pageBreak.iframeRect.top - vpTop;
        const markerRect = marker.getBoundingClientRect();

        // Commented out for now - current solution is to have pagebreaks have their own margin / column.
        // This code will need to be improved if both solutions are desired (separate margins or single margin)

        // const buttonRect = button.getBoundingClientRect();
        // // Ensure the marker isn't placed over the button - always keep it either above or below it
        // if (posY + vpTop + markerRect.height >= buttonRect.top && posY + vpTop < buttonRect.top + buttonRect.height) {
        //     if (posY + vpTop + markerRect.height / 2 < buttonRect.top + buttonRect.height / 2) {
        //         posY = buttonRect.top - markerRect.height - vpTop;
        //     } else {
        //         posY = buttonRect.top + buttonRect.height - vpTop;
        //     }
        // }

        // Ensure the marker isn't placed outside of the container
        const container = button.parentElement;
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
        const viewportRect = this.viewport.getBoundingClientRect();
        const isVertical = this.navView.isVerticalLayout();

        for (const pageBreak of pageBreaks) {
            let posX = pageBreak.rect.left;
            if (pageBreak.iframeRect) {
                posX += pageBreak.iframeRect.left;
            }

            if (isVertical || posX >= viewportRect.width / 2 + viewportRect.left) {
                if (this.nextPageButton){
                    const marker = this.addMarkerToContainer(pageBreak, this.markerContainerRight);
                    this.updateMarkerPosition(pageBreak, marker, this.nextPageButton);
                }
            } else if (posX < viewportRect.width / 2 + viewportRect.left) {
                if (this.prevPageButton){
                    const marker = this.addMarkerToContainer(pageBreak, this.markerContainerLeft);
                    this.updateMarkerPosition(pageBreak, marker, this.prevPageButton);
                }
            }
        }
    }
}
