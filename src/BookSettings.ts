import BookView from "./BookView";
import BookTheme from "./BookTheme";
import BookFont from "./BookFont";
import * as HTMLUtilities from "./HTMLUtilities";
import Store from "./Store";
import * as IconLib from "./IconLib";

const template = (sections: string) => `
    <ul class="settings-menu" role="menu">
        ${sections}
    </ul>
`;

const sectionTemplate = (options: string) => `
    <li><ul class="settings-options">
        ${options}
    </ul></li>
`;

const optionTemplate = (liClassName: string, buttonClassName: string, label: string, role: string, svgIcon: string, buttonId: string) => `
    <li class='${liClassName}'><button id='${buttonId}' class='${buttonClassName}' role='${role}' tabindex=-1>${label}${svgIcon}</button></li>
`;

const offlineTemplate = `
    <li>
        <div class='offline-status'></div>
    </li>
`;

interface SnapOptions {
    snapToElement?: string,
}

export enum TextAlign {
    Publisher = 'publisher',
    Left = 'left',
    Justify = 'justify',
}

export enum ColumnSettings {
    Auto = 'auto',
    OneColumn = '1-column',
    TwoColumn = '2-column',
}

export interface BookSettingsConfig {
    /** Store to save the user's selections in. */
    store: Store,

    /** Array of BookFonts */
    bookFonts: BookFont[],

    /** Array of font sizes in pixels sorted from smallest to largest. */
    fontSizes: number[],

    /** Initial font size to use until the user makes a selection. */
    defaultFontSize?: number,

    /** Array of BookThemes */
    bookThemes: BookTheme[],

    /** Array of BookViews. */
    bookViews: BookView[];

    /** Array of line height sizes */
    lineHeights: number[],

    /** Array of text alignment options */
    textAlignments: string[],

    /** Array of column settings */
    columnOptions: string[],
}

export default class BookSettings {
    private readonly store: Store;
    private readonly bookFonts: BookFont[];
    private fontButtons: { [key: string]: HTMLButtonElement };
    private readonly fontSizes: number[];
    private fontSizeButtons: { [key: string]: HTMLButtonElement };
    private readonly bookThemes: BookTheme[];
    private themeButtons: { [key: string]: HTMLButtonElement };
    private readonly bookViews: BookView[];
    private viewButtons: { [key: string]: HTMLButtonElement };
    private readonly lineHeights: number[];
    private lineHeightButtons: { [key: string]: HTMLButtonElement };
    private readonly textAlignments: string[];
    private textAlignmentButtons: { [key: string]: HTMLButtonElement };
    private readonly columnLayouts: string[];
    private columnLayoutButtons: { [key: string]: HTMLButtonElement };

    private offlineStatusElement: HTMLElement;

    private fontChangeCallback: (newFont: string) => void = () => {};
    private fontSizeChangeCallback: (newFontSize: number) => void = () => {};
    private lineHeightChangeCallback: (newFontSize: number) => void = () => {};
    private textAlignChangeCallback: (newFontSize: string) => void = () => {};
    private themeChangeCallback: (theme: string) => void = () => {};
    private viewChangeCallback: Function = () => {};
    private columnLayoutChangeCallback: Function = () => {};

    private selectedFont: BookFont;
    private selectedFontSize: number;
    private selectedTheme: BookTheme;
    private selectedView: BookView;
    private selectedLineHeight: number;
    private selectedTextAlign: string;
    private selectedColumnLayout: ColumnSettings;

    private static readonly SELECTED_FONT_KEY = "settings-selected-font";
    private static readonly SELECTED_FONT_SIZE_KEY = "settings-selected-font-size";
    private static readonly SELECTED_THEME_KEY = "settings-selected-theme";
    private static readonly SELECTED_VIEW_KEY = "settings-selected-view";
    private static readonly SELECTED_ALIGN_KEY = "settings-selected-align";
    private static readonly SELECTED_LINE_HEIGHT_KEY = "settings-selected-line-height";
    private static readonly SELECTED_COLUMN_LAYOUT = "settings-column-layout";

    public static async create(config: BookSettingsConfig) {
        const settings = new this(config.store, config.bookFonts, config.fontSizes, config.bookThemes, config.bookViews,
            config.lineHeights, config.textAlignments, config.columnOptions);
        await settings.initializeSelections(config.defaultFontSize ? config.defaultFontSize : undefined);
        return settings;
    }

    protected constructor(store: Store, bookFonts: BookFont[], fontSizes: number[], bookThemes: BookTheme[], bookViews: BookView[]
        , lineHeights: number[], textAlignments: string[], columnSettings: string[]) {
        this.store = store;
        this.bookFonts = bookFonts;
        this.fontSizes = fontSizes;
        this.bookThemes = bookThemes;
        this.bookViews = bookViews;
        this.lineHeights = lineHeights;
        this.textAlignments = textAlignments;
        this.columnLayouts = columnSettings;
    }

    private async initializeSelections(defaultFontSize?: number): Promise<void> {
        if (this.bookFonts.length >= 1) {
            let selectedFont = this.bookFonts[0];
            const selectedFontName = await this.store.get(BookSettings.SELECTED_FONT_KEY);
            if (selectedFontName) {
                for (const bookFont of this.bookFonts) {
                    if (bookFont.name === selectedFontName) {
                        selectedFont = bookFont;
                        break;
                    }
                }
            }
            this.selectedFont = selectedFont;
        }

        if (this.textAlignments.length >= 1) {
            let selectedAlign = this.textAlignments[0];
            const selectedAlignName = await this.store.get(BookSettings.SELECTED_ALIGN_KEY);
            if (selectedAlignName) {
                for (const align of this.textAlignments) {
                    if (align === selectedAlignName) {
                        selectedAlign = align;
                        break;
                    }
                }
            }
            this.selectedTextAlign = selectedAlign;
        }

        if (this.lineHeights.length >= 1) {
            let selectedLineHeight = await this.store.get(BookSettings.SELECTED_LINE_HEIGHT_KEY);
            if (typeof(selectedLineHeight) === 'string') {
                selectedLineHeight = Number.parseFloat(selectedLineHeight);
            }
            const middle = Math.floor(this.lineHeights.length / 2);
            this.selectedLineHeight = selectedLineHeight || this.lineHeights[middle];
         }

        if (this.fontSizes.length >= 1) {
            // First, check if the user has previously set a font size.
            let selectedFontSize = await this.store.get(BookSettings.SELECTED_FONT_SIZE_KEY);
            if (typeof(selectedFontSize) === 'string') {
                selectedFontSize = Number.parseFloat(selectedFontSize);
            }
            let selectedFontSizeIsAvailable = (selectedFontSize && this.fontSizes.indexOf(selectedFontSize) !== -1);
            // If not, or the user selected a size that's no longer an option, is there a default font size?
            if ((!selectedFontSize || !selectedFontSizeIsAvailable) && defaultFontSize) {
                selectedFontSize = defaultFontSize;
                selectedFontSizeIsAvailable = (selectedFontSize && this.fontSizes.indexOf(selectedFontSize) !== -1);
            }
            // If there's no selection and no default, pick a font size in the middle of the options.
            if (!selectedFontSize || !selectedFontSizeIsAvailable) {
                const averageFontSizeIndex = Math.floor(this.fontSizes.length / 2);
                selectedFontSize = this.fontSizes[averageFontSizeIndex];
            }
            this.selectedFontSize = selectedFontSize;
        }

        if (this.bookThemes.length >= 1) {
            let selectedTheme = this.bookThemes[0];
            const selectedThemeName = await this.store.get(BookSettings.SELECTED_THEME_KEY);
            if (selectedThemeName) {
                for (const bookTheme of this.bookThemes) {
                    if (bookTheme.name === selectedThemeName) {
                        selectedTheme = bookTheme;
                        break;
                    }
                }
            }
            this.selectedTheme = selectedTheme;
        }

        if (this.columnLayouts.length >= 1) {
            this.selectedColumnLayout = <ColumnSettings> await this.store.get(BookSettings.SELECTED_COLUMN_LAYOUT) || ColumnSettings.TwoColumn;
        }

        if (this.bookViews.length >= 1) {
            let selectedView = this.bookViews[0];
            const selectedViewName = await this.store.get(BookSettings.SELECTED_VIEW_KEY);
            if (selectedViewName) {
                for (const bookView of this.bookViews) {
                    if (bookView.name === selectedViewName) {
                        selectedView = bookView;
                        break;
                    }
                }
            }
            this.selectedView = selectedView;
        }
    }

    public renderControls(element: HTMLElement, snapOptions: SnapOptions = {}): void {
        const sections = [];

        if (this.fontSizes.length > 1) {
            const fontSizeOptions = optionTemplate("font-setting", "decrease", "A-", "menuitem", "", "decrease-font")
                + optionTemplate("font-setting", "increase", "A+", "menuitem", "", "increase-font");
            sections.push(sectionTemplate(fontSizeOptions));
        }

        if (this.lineHeights.length > 1) {
            const lineHeightOptions = optionTemplate("line-height-setting", "decreaseLineHeight", IconLib.icons.decreaseLineHeight, "menuitem", "", "decrease-line-height")
                + optionTemplate("line-height-setting", "increaseLineHeight", IconLib.icons.increaseLineHeight, "menuitem", "", "increase-line-height");
            sections.push(sectionTemplate(lineHeightOptions));
        }

        if (this.textAlignments.length > 1) {
            const textAlignmentOptions = this.textAlignments.map(textAlignment =>
                optionTemplate("reading-style", "text-alignment", textAlignment, "menuitem", "", "text-alignment-" + textAlignment)
            );
            sections.push(sectionTemplate(textAlignmentOptions.join("")));
        }

        if (this.bookFonts.length > 1) {
            const fontOptions = this.bookFonts.map(bookFont =>
                optionTemplate("reading-style", bookFont.name, bookFont.label, "menuitem", "", bookFont.label)
            );
            sections.push(sectionTemplate(fontOptions.join("")));
        }

        if (this.bookThemes.length > 1) {
            const themeOptions = this.bookThemes.map( (bookTheme) => {
                const colorPreview = `<span class="color-preview"></span> ${bookTheme.label}`;
                return optionTemplate("reading-theme", bookTheme.name, colorPreview, "menuitem", "", bookTheme.label)
            });
            sections.push(sectionTemplate(themeOptions.join("")));
        }

        if (this.columnLayouts.length > 1) {
            const columnOptions = this.columnLayouts.map((column) => {
                return optionTemplate("column-layout", column + "-button", column.split('-').join(' '), "menuitem", "", column);
            });
            sections.push(sectionTemplate(columnOptions.join("")));
        }

        if (this.bookViews.length > 1) {
            const viewOptions = this.bookViews.map(bookView =>
                optionTemplate("reading-style", bookView.name, bookView.label, "menuitem", "", bookView.label)
            );
            sections.push(sectionTemplate(viewOptions.join("")));
        }
        sections.push(offlineTemplate);

        element.innerHTML = template(sections.join(""));

        const snapToElement = document.getElementById(snapOptions.snapToElement || '');
        if (snapToElement) {
            const snapRect = snapToElement.getBoundingClientRect();
            element.style.setProperty('top', `${snapRect.top + snapRect.height}px`);
        }

        this.lineHeightButtons = {};
        if (this.lineHeights.length > 1) {
            for (const lineHeightName of ['decreaseLineHeight', 'increaseLineHeight']) {
                this.lineHeightButtons[lineHeightName] = HTMLUtilities.findRequiredElement(element, "button[class=" + lineHeightName + "]") as HTMLButtonElement;
            }
            this.updateLineHeightButtons();
        }

        this.textAlignmentButtons = {};
        if (this.textAlignments.length > 1) {
            for (const align of this.textAlignments) {
                this.textAlignmentButtons[align] = HTMLUtilities.findRequiredElement(element, "button[id=text-alignment-" + align + "]") as HTMLButtonElement;
            }
            this.updateTextAlignButtons();
        }

        this.fontButtons = {};
        if (this.bookFonts.length > 1) {
            for (const bookFont of this.bookFonts) {
                this.fontButtons[bookFont.name] = HTMLUtilities.findRequiredElement(element, "button[class=" + bookFont.name + "]") as HTMLButtonElement;
            }
            this.updateFontButtons();
        }
        this.fontSizeButtons = {};
        if (this.fontSizes.length > 1) {
            for (const fontSizeName of ["decrease", "increase"]) {
                this.fontSizeButtons[fontSizeName] = HTMLUtilities.findRequiredElement(element, "button[class=" + fontSizeName + "]") as HTMLButtonElement;
            }
            this.updateFontSizeButtons();
        }
        this.themeButtons = {};
        if (this.bookThemes.length > 1) {
            for (const bookTheme of this.bookThemes) {
                this.themeButtons[bookTheme.name] = HTMLUtilities.findRequiredElement(element, "button[class=" + bookTheme.name + "]") as HTMLButtonElement;
            }
            this.updateThemeButtons();
        }
        this.columnLayoutButtons = {};
        if (this.columnLayouts.length > 1) {
            for (const column of this.columnLayouts) {
                this.columnLayoutButtons[column] = HTMLUtilities.findRequiredElement(element, "button[class=" + `"${column}-button"` + "]") as HTMLButtonElement;
            }
            this.updateColumnLayoutButtons();
        }
        this.viewButtons = {};
        if (this.bookViews.length > 1) {
            for (const bookView of this.bookViews) {
                this.viewButtons[bookView.name] = HTMLUtilities.findRequiredElement(element, "button[class=" + bookView.name + "]") as HTMLButtonElement;
            }
            this.updateViewButtons();
        }

        this.offlineStatusElement = HTMLUtilities.findRequiredElement(element, 'div[class="offline-status"]') as HTMLElement;

        this.setupEvents();

        // Clicking the settings view outside the ul hides it, but clicking inside the ul keeps it up.
        HTMLUtilities.findRequiredElement(element, "ul").addEventListener("click", (event: Event) => {
            event.stopPropagation();
        });
    }

    public onFontChange(callback: (newFont: string) => void) {
        this.fontChangeCallback = callback;
    }

    public onFontSizeChange(callback: (newFontSize: number) => void) {
        this.fontSizeChangeCallback = callback;
    }

    public onLineHeightChange(callback: (newLineHeight: number) => void) {
        this.lineHeightChangeCallback = callback;
    }

    public onTextAlignChange(callback: (newTextAlign: string) => void) {
        this.textAlignChangeCallback = callback;
    }

    public onThemeChange(callback: (theme: string) => void) {
        this.themeChangeCallback = callback;
    }

    public onViewChange(callback: () => void) {
        this.viewChangeCallback = callback;
    }

    public onColumnSettingChange(callback: () => void) {
        this.columnLayoutChangeCallback = callback;
    }

    private setupEvents(): void {
        for (const font of this.bookFonts) {
            const button = this.fontButtons[font.name];
            if (button) {
                button.addEventListener("click", (event: MouseEvent) => {
                    // this.selectedFont.stop();
                    // font.start();
                    this.selectedFont = font;
                    this.updateFontButtons();
                    this.storeSelectedFont(font);
                    this.fontChangeCallback(font.name);
                    event.preventDefault();
                });
            }
        }

        for (const align of this.textAlignments) {
            const button = this.textAlignmentButtons[align];
            if (button) {
                button.addEventListener("click", (event: MouseEvent) => {
                    this.selectedTextAlign = align;
                    this.updateTextAlignButtons();
                    this.storeSelectedTextAlign(align);
                    this.textAlignChangeCallback(align);
                    event.preventDefault();
                });
            }
        }

        if (this.lineHeights.length > 1) {
            const setNewLineHeight = (newLineHeight: number) => {
                this.selectedLineHeight = newLineHeight;
                this.lineHeightChangeCallback(newLineHeight);
                this.updateLineHeightButtons();
                this.storeSelectedLineHeight(newLineHeight);
            };
            const decrease = this.lineHeightButtons["decreaseLineHeight"];
            if (decrease) {
                decrease.addEventListener("click", (event: MouseEvent) => {
                    const lineHeightIndex = this.lineHeights.indexOf(this.selectedLineHeight);
                    if (lineHeightIndex > 0) {
                        const newLineHeight = this.lineHeights[lineHeightIndex - 1];
                        setNewLineHeight(newLineHeight);
                    }
                    event.preventDefault();
                });
            }
            const increase = this.lineHeightButtons["increaseLineHeight"];
            if (increase) {
                increase.addEventListener("click", (event: MouseEvent) => {
                    const lineHeightIndex = this.lineHeights.indexOf(this.selectedLineHeight);
                    if (lineHeightIndex < this.lineHeights.length - 1) {
                        const newLineHeight = this.lineHeights[lineHeightIndex + 1];
                        setNewLineHeight(newLineHeight);
                    }
                    event.preventDefault();
                });
            }
        }

        if (this.fontSizes.length > 1) {
            this.fontSizeButtons["decrease"].addEventListener("click", (event: MouseEvent) => {
                const currentFontSizeIndex = this.fontSizes.indexOf(this.selectedFontSize);
                if (currentFontSizeIndex > 0) {
                    const newFontSize = this.fontSizes[currentFontSizeIndex - 1];
                    this.selectedFontSize = newFontSize;
                    this.fontSizeChangeCallback(newFontSize);
                    this.updateFontSizeButtons();
                    this.storeSelectedFontSize(newFontSize);
                }
                event.preventDefault();
            });

            this.fontSizeButtons["increase"].addEventListener("click", (event: MouseEvent) => {
                const currentFontSizeIndex = this.fontSizes.indexOf(this.selectedFontSize);
                if (currentFontSizeIndex < this.fontSizes.length - 1) {
                    const newFontSize = this.fontSizes[currentFontSizeIndex + 1];
                    this.selectedFontSize = newFontSize;
                    this.fontSizeChangeCallback(newFontSize);
                    this.updateFontSizeButtons();
                    this.storeSelectedFontSize(newFontSize);
                }
                event.preventDefault();
            });
        }

        for (const theme of this.bookThemes) {
            const button = this.themeButtons[theme.name];
            if (button) {
                button.addEventListener("click", (event: MouseEvent) => {
                    this.selectedTheme.stop();
                    theme.start();
                    this.selectedTheme = theme;
                    this.updateThemeButtons();
                    this.storeSelectedTheme(theme);
                    this.themeChangeCallback(theme.name);
                    event.preventDefault();
                });
            }
        }

        for (const column of this.columnLayouts) {
            const button = this.columnLayoutButtons[column];
            if (button) {
                button.addEventListener("click", () => {
                    if (column === ColumnSettings.TwoColumn && this.selectedView.name === 'scrolling-book-view') {
                        const view = this.bookViews.find((bv) => {
                            return bv.name === 'columns-paginated-view';
                        });
                        if (view) {
                            this.selectedView = view;
                            this.storeSelectedView(view);
                            this.updateViewButtons();
                        }

                    }

                    this.setColumnLayout(<ColumnSettings> column);
                });
            }
        }

        for (const view of this.bookViews) {
            const button = this.viewButtons[view.name];
            if (button) {
                button.addEventListener("click", (event: MouseEvent) => {
                    const position = this.selectedView.getCurrentPosition();
                    this.selectedView.stop();
                    view.start(position);
                    this.selectedView = view;
                    this.updateViewButtons();

                    if (view.name === 'scrolling-book-view' && this.selectedColumnLayout === ColumnSettings.TwoColumn) {
                        this.setColumnLayout(ColumnSettings.Auto);
                    }

                    this.storeSelectedView(view);
                    this.viewChangeCallback();
                    event.preventDefault();
                });
            }
        }
    }

    private setColumnLayout(column: ColumnSettings) {
        this.storeSelectedColumnLayout(column);
        this.selectedColumnLayout = column;
        this.updateColumnLayoutButtons();
        this.columnLayoutChangeCallback(column);
    }

    private updateColumnLayoutButtons() {
        for (const column of this.columnLayouts) {
            if (column === this.selectedColumnLayout) {
                this.columnLayoutButtons[column].classList.add('active');
                this.columnLayoutButtons[column].setAttribute('aria-label', column.split('-').join(' ') + ' enabled');
            } else {
                this.columnLayoutButtons[column].classList.remove('active');
                this.columnLayoutButtons[column].setAttribute('aria-label', column.split('-').join(' ') + ' disabled');
            }
        }
    }

    private updateFontButtons(): void {
        for (const font of this.bookFonts) {
            if (font === this.selectedFont) {
                this.fontButtons[font.name].className = font.name + " active";
                this.fontButtons[font.name].setAttribute("aria-label", font.label + " font enabled");
            } else {
                this.fontButtons[font.name].className = font.name;
                this.fontButtons[font.name].setAttribute("aria-label", font.label + " font disabled");
            }
        }
    }

    private updateTextAlignButtons(): void {
        for (const align of this.textAlignments) {
            if (align === this.selectedTextAlign) {
                this.textAlignmentButtons[align].className = align + " active";
                this.textAlignmentButtons[align].setAttribute("aria-label", align + " text-align enabled");
            } else {
                this.textAlignmentButtons[align].className = align;
                this.textAlignmentButtons[align].setAttribute("aria-label", align + " text-align disabled");
            }
        }
    }

    private updateLineHeightButtons(): void {
        const index = this.lineHeights.indexOf(this.selectedLineHeight);

        if (index === 0) {
            this.lineHeightButtons["decreaseLineHeight"].className = "decreaseLineHeight disabled";
        } else {
            this.lineHeightButtons["decreaseLineHeight"].className = "decreaseLineHeight";
        }

        if (index === this.fontSizes.length - 1) {
            this.lineHeightButtons["increaseLineHeight"].className = "increaseLineHeight disabled";
        } else {
            this.lineHeightButtons["increaseLineHeight"].className = "increaseLineHeight";
        }
    }

    private updateFontSizeButtons(): void {
        const currentFontSizeIndex = this.fontSizes.indexOf(this.selectedFontSize);

        if (currentFontSizeIndex === 0) {
            this.fontSizeButtons["decrease"].className = "decrease disabled";
        } else {
            this.fontSizeButtons["decrease"].className = "decrease";
        }

        if (currentFontSizeIndex === this.fontSizes.length - 1) {
            this.fontSizeButtons["increase"].className = "increase disabled";
        } else {
            this.fontSizeButtons["increase"].className = "increase";
        }
    }

    private updateThemeButtons(): void {
        for (const theme of this.bookThemes) {
            if (theme === this.selectedTheme) {
                this.themeButtons[theme.name].className = theme.name + " active";
                this.themeButtons[theme.name].setAttribute("aria-label", theme.label + " mode enabled");
            } else {
                this.themeButtons[theme.name].className = theme.name;
                this.themeButtons[theme.name].setAttribute("aria-label", theme.label + " mode disabled");
            }
        }
    }

    private updateViewButtons(): void {
        for (const view of this.bookViews) {
            if (view === this.selectedView) {
                this.viewButtons[view.name].className = view.name + " active";
                this.viewButtons[view.name].setAttribute("aria-label", view.label + " mode enabled");
            } else {
                this.viewButtons[view.name].className = view.name;
                this.viewButtons[view.name].setAttribute("aria-label", view.label + " mode disabled");
            }
        }
    }

    public getSelectedFont(): BookFont {
        return this.selectedFont;
    }

    public getSelectedFontSize(): number {
        return this.selectedFontSize;
    }

    public getSelectedTheme(): BookTheme {
        return this.selectedTheme;
    }

    public getSelectedView(): BookView {
        return this.selectedView;
    }

    public getSelectedLineHeight(): number {
        return this.selectedLineHeight;
    }

    public getSelectedTextAlign(): string {
        return this.selectedTextAlign;
    }

    public getOfflineStatusElement(): HTMLElement {
        return this.offlineStatusElement;
    }

    public getSelectedColumnLayout(): ColumnSettings {
        return this.selectedColumnLayout;
    }

    private async storeSelectedFont(font: BookFont): Promise<void> {
        return this.store.set(BookSettings.SELECTED_FONT_KEY, font.name);
    }

    private async storeSelectedFontSize(fontSize: number): Promise<void> {
        return this.store.set(BookSettings.SELECTED_FONT_SIZE_KEY, fontSize);
    }

    private async storeSelectedTheme(theme: BookTheme): Promise<void> {
        return this.store.set(BookSettings.SELECTED_THEME_KEY, theme.name);
    }

    private async storeSelectedView(view: BookView): Promise<void> {
        return this.store.set(BookSettings.SELECTED_VIEW_KEY, view.name);
    }

    private async storeSelectedTextAlign( align: string ): Promise<void> {
        return this.store.set(BookSettings.SELECTED_ALIGN_KEY, align);
    }

    private async storeSelectedLineHeight( lineHeight: number ): Promise<void> {
        return this.store.set(BookSettings.SELECTED_LINE_HEIGHT_KEY, lineHeight);
    }

    private async storeSelectedColumnLayout( columnSettings: ColumnSettings ): Promise<void> {
        return this.store.set(BookSettings.SELECTED_COLUMN_LAYOUT, columnSettings);
    }
};
