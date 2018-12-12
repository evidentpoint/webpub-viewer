
export const enum SnapEdge {
    BOTTOM = 'bottom',
    TOP = 'top',
}

interface ShareBookLocationOptions {
    appendToElement: string,
    snapToElement: string,
    snapToElementEdge: SnapEdge,
    centerTo: string,
    focusTrapCb: Function,
    onShowCb: Function,
}

export class ShareBookLocation {
    private container: HTMLElement;
    private snapToElement: HTMLElement;
    private snapToElementEdge: SnapEdge;
    private centerToElement: HTMLElement;
    private shareBtn: HTMLButtonElement;
    private shareModal: HTMLDivElement;
    private shareText: HTMLTextAreaElement;
    private onShowCb: Function;
    private shareLink: string;

    constructor(opts: ShareBookLocationOptions) {
        const container = document.getElementById(opts.appendToElement);
        if (!container) {
            console.error('appendTo was not given a valid element id');
            return;
        }
        this.container = container;

        const snapToElement = document.getElementById(opts.snapToElement);
        if (!snapToElement) {
            console.error('snapToElement was not given a valid element id');
            return;
        }
        this.snapToElement = snapToElement;

        this.snapToElementEdge = opts.snapToElementEdge;
        const centerToElement = document.getElementById(opts.centerTo);
        if (!centerToElement) {
            console.error('centerToElement was not given a valid element id');
            return;
        }
        this.centerToElement = centerToElement;
        this.onShowCb = opts.onShowCb;

        this.initializeButton();

        opts.focusTrapCb(this.shareModal, this.shareBtn, this.shareText);
        this.hideModal();
    }

    public setShareLink(shareLink: string) {
        this.shareLink = shareLink;
        this.shareText.value = this.shareLink;
    }

    public toggleModal(): void {
        const isOpen = this.isModalVisible();

        if (isOpen) {
            this.hideModal();
        } else {
            this.showModal();
        }
    }

    public hideModal(): void {
        this.shareBtn.setAttribute('aria-expanded', 'false');
        this.shareModal.style.setProperty('display', 'none');
        this.shareModal.classList.remove('active');
    }

    public showModal(): void {
        this.onShowCb();
        this.shareBtn.setAttribute('aria-expanded', 'true');
        this.shareModal.style.setProperty('display', '')
        this.shareModal.classList.add('active');
        this.repositionModal();
        this.shareText.focus();

        const textLength = this.shareLink.length;
        this.shareText.setSelectionRange(0, textLength);
    }

    public isModalVisible(): boolean {
        return this.shareModal.style.getPropertyValue('display') !== 'none';
    }

    private initializeButton() {
        this.shareBtn = this.createShareButton();
        this.container.appendChild(this.shareBtn);

        this.shareModal = this.createModal();
        this.shareText = this.shareModal.getElementsByTagName('textarea')[0];
        this.container.appendChild(this.shareModal);
        const backgroundLayer = this.createBackgroundModalLayer();
        this.shareModal.appendChild(backgroundLayer);

        this.shareBtn.addEventListener('click', () => {
            this.toggleModal();
        });

        this.shareModal.addEventListener('keydown', (event: KeyboardEvent) => {
            this.hideOnEscape(event);
        });
        this.shareBtn.addEventListener('keydown', (event: KeyboardEvent) => {
            this.hideOnEscape(event);
        })

        backgroundLayer.addEventListener('click', () => {
            this.hideModal();
        });
    }

    private createShareButton(): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.setAttribute('id', 'share-btn');
        btn.setAttribute('class', 'setting-text toolbar-btn');
        btn.setAttribute('aria-haspopup', 'true');
        btn.textContent = 'Share';

        return btn;
    }

    private createBackgroundModalLayer(): HTMLDivElement {
        const div = document.createElement('div');
        div.style.setProperty('width', '100%');
        div.style.setProperty('position', 'fixed');
        div.style.setProperty('height', `100%`)
        const snapRects = this.snapToElement.getBoundingClientRect();
        div.style.setProperty('top', `${snapRects.height}px`);
        div.style.setProperty('left', '0px');
        div.style.setProperty('z-index', '-1');

        return div;
    }

    private repositionModal(): void {
        const snapRects = this.snapToElement.getBoundingClientRect();
        let offsetTop = snapRects.top;
        if (this.snapToElementEdge === SnapEdge.BOTTOM) {
            offsetTop += snapRects.height;
        }

        const centerRects = this.centerToElement.getBoundingClientRect();
        const modalRects = this.shareModal.getBoundingClientRect();
        let offsetLeft = centerRects.left + centerRects.width / 2 - modalRects.width / 2;

        this.shareModal.style.setProperty('top', `${offsetTop}px`);
        this.shareModal.style.setProperty('left', `${offsetLeft}px`);
    }

    private createModal(): HTMLDivElement {
        const modalEl = document.createElement('div') as HTMLDivElement;
        modalEl.setAttribute('class', 'settings-popover');
        const rows = 3;
        const cols = 50;
        modalEl.innerHTML = `
            Copy this shareable link: <br>
            <textarea rows="${rows}" cols="${cols}" readonly></textarea>
        `;

        return modalEl;
    }

    private hideOnEscape(event: KeyboardEvent) {
        const ESCAPE_KEY = 27;
        const isDisplayed = this.isModalVisible();
        if (isDisplayed && event.keyCode === ESCAPE_KEY) {
            this.hideModal();
        }
    }
}
