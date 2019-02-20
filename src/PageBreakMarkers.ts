import { R2NavigatorView } from "./R2NavigatorView";
import { SimpleNavigatorView } from "./SimpleNavigatorView";
import { PageBreakData } from '@readium/navigator-web';

interface MarkerData {
    marker: HTMLDivElement,
    rect: DOMRect | ClientRect,
}

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

    // Only contrains to y-axis, since that's all that's being used for now
    private constrainRectToContainer(rect: ClientRect | DOMRect, container: HTMLDivElement) {
        // Ensure the marker isn't placed outside of the container
        const contRect = container.getBoundingClientRect();
        const vpRect = this.viewport.getBoundingClientRect();
        const vpTop = vpRect.top;
        let newTop = rect.top;

        if (rect.top + vpTop < contRect.top) {
            newTop = contRect.top - vpTop;
        } else if (rect.top + rect.height + vpTop > contRect.top + contRect.height) {
            newTop = contRect.top + contRect.height - rect.height - vpTop;
        }

        return new DOMRect(rect.left, newTop, rect.width, rect.height);
    }

    private updateMarkerPosition(pageBreak: PageBreakData, marker: HTMLDivElement, container: HTMLDivElement): void {
        const isVertical = this.navView.isVerticalLayout();
        let offset = pageBreak.spineItemOffset;
        if (!offset || !isVertical) {
            offset = 0;
        }
        let posY = pageBreak.rect.top - offset;
        const markerRect = marker.getBoundingClientRect();

        posY = posY + pageBreak.rect.height / 2 - markerRect.height / 2;
        if (container) {
            let newRect = new DOMRect(markerRect.left, posY, markerRect.width, markerRect.height);
            newRect = this.constrainRectToContainer(newRect, container);
            posY = newRect.top;
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

    // Every marker will be placed in its own group, with exception to overlapped
    // markers that will share the same group.
    //
    // Assumptions:
    //  All markers are positioned on the same y-axis
    //  markerDataArr is sorted based on their y positions
    private findOverlappedMarkers(markerDataArr: MarkerData[]): MarkerGroup[] {
        let markerGroup: MarkerGroup = new MarkerGroup();
        const markerGroups: MarkerGroup[] = [];

        let hasCollisionYAxis = false;
        let hadCollisionYAxis = false;
        markerDataArr.forEach((markerData: MarkerData, i: number) => {
            if (i < markerDataArr.length-1) {
                hasCollisionYAxis = false;
                const bounding1 = markerData.rect;
                const bounding2 = markerDataArr[i+1].rect;
                hasCollisionYAxis = Math.abs(bounding1.top - bounding2.top) < bounding1.height / 2 + bounding2.height / 2;
            }
            if (hasCollisionYAxis || hadCollisionYAxis) {
                markerGroup.markers.push(markerData.marker);
            }

            if (i === markerDataArr.length-1) {
                // This is the last marker - set to false for markerGroup to be pushed into markerGroups
                hasCollisionYAxis = false;
            }
            if (!hasCollisionYAxis && markerGroup.markers.length > 1 ) {
                markerGroups.push(markerGroup);
                markerGroup = new MarkerGroup();
            }

            hadCollisionYAxis = hasCollisionYAxis;
        });

        return markerGroups;
    }

    private moveOverlappedMarkers(markers: HTMLDivElement[], container?: HTMLDivElement, recursionCount: number = 0): void {
        // Get the rect's now so that this array can be sorted by the y-axis
        const markerDataArr: MarkerData[] = markers.map((marker) => {
            const rect = marker.getBoundingClientRect();
            return {
                marker: marker,
                rect: rect,
            };
        });

        const markerGroups = this.findOverlappedMarkers(markerDataArr);
        if (markerGroups.length === 0) {
            return;
        }

        markerGroups.forEach((markerGroup: MarkerGroup) => {
            const boundingRect = markerGroup.calculateAndSetBoundingRect();
            const vpRect = this.viewport.getBoundingClientRect();
            const midpoint = boundingRect.top - vpRect.top + boundingRect.height / 2;
            const groupStartTop = midpoint - markerGroup.combinedMarkerHeight / 2;
            const markers = markerGroup.markers;

            let newBoundingRect = new DOMRect(0, groupStartTop, 0, markerGroup.combinedMarkerHeight);
            if (container) {
                newBoundingRect = this.constrainRectToContainer(newBoundingRect, container);
            }

            let totalHeight = 0;
            markers.forEach((marker: HTMLDivElement) => {
                const markerRect = marker.getBoundingClientRect();
                marker.style.setProperty('top', `${newBoundingRect.top + totalHeight}px`);
                totalHeight += markerRect.height;
            });
        });

        // As a rough way to deal with additional overlaps, just run this method again up to 3 times
        // If a better solution is ever needed, it would be good to recursively check the markerGroups
        // until no group collides with another.
        if (recursionCount < 3) {
            this.moveOverlappedMarkers(markers, container, recursionCount += 1);
        }
    }

    private populateMarkerContainers(pageBreaks: PageBreakData[]): void {
        const isVertical = this.navView.isVerticalLayout();

        const markersLeft = [];
        const markersRight = [];
        for (const pageBreak of pageBreaks) {
            if (isVertical || !pageBreak.isOnLeftSide) {
                const marker = this.addMarkerToContainer(pageBreak, this.markerContainerRight);
                this.updateMarkerPosition(pageBreak, marker, this.markerContainerRight);
                markersRight.push(marker);
            } else if (pageBreak.isOnLeftSide) {
                const marker = this.addMarkerToContainer(pageBreak, this.markerContainerLeft);
                this.updateMarkerPosition(pageBreak, marker, this.markerContainerLeft);
                markersLeft.push(marker);
            }
        }

        // Check for overlapping markers
        if (markersLeft.length > 1) {
            this.moveOverlappedMarkers(markersLeft, this.markerContainerLeft);
        }
        if (markersRight.length > 1) {
            this.moveOverlappedMarkers(markersRight, this.markerContainerRight);
        }
    }
}

class MarkerGroup {
    public markers: HTMLDivElement[] = [];
    public combinedMarkerHeight: number = 0;
    private boundingRect: DOMRect;
    public getBoundingClientRect(): DOMRect {
        return this.boundingRect;
    }
    public calculateAndSetBoundingRect(): DOMRect {
        const rect = this.calculateBoundingRect();
        this.setBoundingClientRect(rect);

        return rect;
    }
    private calculateBoundingRect(): DOMRect {
        let left: {min?: number, max?: number} = {min: undefined, max: undefined};
        let top: {min?: number, max?: number} = {min: undefined, max: undefined};
        this.combinedMarkerHeight = 0;
        this.markers.forEach((marker: HTMLDivElement) => {
            const bounding = marker.getBoundingClientRect();
            if (!left.min || bounding.left < left.min) {
                left.min = bounding.left;
            }
            if (!left.max || bounding.left + bounding.width > left.max) {
                left.max = bounding.left + bounding.width;
            }
            if (!top.min || bounding.top < top.min) {
                top.min = bounding.top;
            }
            if (!top.max || bounding.top + bounding.height > top.max) {
                top.max = bounding.top + bounding.height;
            }
            this.combinedMarkerHeight += bounding.height;
        });
        return new DOMRect(left.min, top.min, left.max! - left.min!, top.max! - top.min!);
    }
    private setBoundingClientRect(rect: DOMRect): void {
        this.boundingRect = rect;
    }
};
