document.addEventListener("DOMContentLoaded", function () {

    // Theme: system | light | dark
    const THEMES = ["system", "light", "dark"];

    const themeIcons = {
        system: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
        light:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
        dark:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    };

    const applyTheme = (theme) => {
        const root = document.documentElement;
        if (theme === "system") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", theme);
        }
        const toggleBtn = document.getElementById("theme-toggle");
        if (toggleBtn) {
            toggleBtn.innerHTML = themeIcons[theme];
            toggleBtn.title = `Theme: ${theme}`;
        }
    };

    const initTheme = () => {
        chrome.storage.local.get("theme", (result) => {
            applyTheme(result.theme || "system");
        });
    };

    const cycleTheme = () => {
        chrome.storage.local.get("theme", (result) => {
            const current = result.theme || "system";
            const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
            chrome.storage.local.set({ theme: next });
            applyTheme(next);
        });
    };

    initTheme();
    document.getElementById("theme-toggle").addEventListener("click", cycleTheme);

    // Get DOM elements
    const colorInput = document.getElementById("color-input");
    const generateButton = document.getElementById("generate-button");
    const outputContainer = document.getElementById("output-container");
    const cssOutput = document.getElementById("css-output");
    const colorPreview = document.getElementById("color-preview");
    const comboContainer = document.getElementById("combo-container");

    // Color conversion utilities
    const hexToRgb = (hex) => {
        hex = hex.replace("#", "");
        if (hex.length === 3) {
            hex = hex.split("").map((char) => char + char).join("");
        }
        const bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
        };
    };

    const rgbToHex = (r, g, b) => {
        return (
            "#" +
            [r, g, b]
                .map((x) => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                })
                .join("")
                .toUpperCase()
        );
    };

    const rgbToHsl = (r, g, b) => {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h,
            s,
            l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
                default:
                    h = 0;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    };

    const hslToRgb = (h, s, l) => {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255),
        };
    };

    const processColor = (hsl) => {
        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return {
            hex,
            rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            textColor: luminance > 0.5 ? "#000000" : "#FFFFFF",
        };
    };

    const getSuggestedColors = (baseHsl) => {
        const suggestions = [];
        const { h, s, l } = baseHsl;

        suggestions.push({
            tint: "complementary",
            type: "suggestion",
            name: "Complementary",
            ...processColor({ h: (h + 180) % 360, s, l }),
        });

        suggestions.push({
            tint: "analogous-1",
            type: "suggestion",
            name: "Analogous 1",
            ...processColor({ h: (h + 30) % 360, s, l }),
        });

        suggestions.push({
            tint: "analogous-2",
            type: "suggestion",
            name: "Analogous 2",
            ...processColor({ h: (h - 30 + 360) % 360, s, l }),
        });

        suggestions.push({
            tint: "triadic-1",
            type: "suggestion",
            name: "Triadic 1",
            ...processColor({ h: (h + 120) % 360, s, l }),
        });

        suggestions.push({
            tint: "triadic-2",
            type: "suggestion",
            name: "Triadic 2",
            ...processColor({ h: (h + 240) % 360, s, l }),
        });

        return suggestions;
    };

    const getTintedColors = (baseColor) => {
        baseColor = baseColor.startsWith("#") ? baseColor : "#" + baseColor;

        const rgb = hexToRgb(baseColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        const tints = [
            // Light variants (100-1000)
            ...Array.from({ length: 10 }, (_, i) => {
                const tintNumber = (i + 1) * 100;
                const lightness =
                    tintNumber === 1000
                        ? hsl.l
                        : 95 - ((95 - hsl.l) * (tintNumber - 100)) / 900;
                return { tint: tintNumber.toString(), lightness: Math.round(lightness), type: "light" };
            }),
            // Dark variants (1100-2000)
            ...Array.from({ length: 10 }, (_, i) => {
                const tintNumber = (i + 11) * 100;
                const lightness = hsl.l - ((hsl.l - 5) * (tintNumber - 1000)) / 1000;
                return { tint: tintNumber.toString(), lightness: Math.round(lightness), type: "dark" };
            }),
            { tint: "separator", type: "separator", name: "Suggested color combinations" },
            ...getSuggestedColors({ h: hsl.h, s: hsl.s, l: hsl.l }),
        ];

        return tints.map((tint) => {
            if (tint.type === "separator" || tint.type === "suggestion") {
                return tint;
            }

            const clampedLightness = Math.max(0, Math.min(100, tint.lightness));
            const newRgb = tint.tint === "1000" ? rgb : hslToRgb(hsl.h, hsl.s, clampedLightness);
            const hex = tint.tint === "1000" ? baseColor : rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            const luminance = (0.299 * newRgb.r + 0.587 * newRgb.g + 0.114 * newRgb.b) / 255;

            return {
                tint: tint.tint,
                hex,
                rgb: `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`,
                hsl: `hsl(${hsl.h}, ${hsl.s}%, ${clampedLightness}%)`,
                type: tint.type,
                textColor: luminance > 0.5 ? "#000000" : "#FFFFFF",
            };
        });
    };

    // Sanitise strings before inserting them via innerHTML
    const escapeHtml = (str) =>
        String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const validateHexColor = (hex) => {
        const regex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return regex.test(hex);
    };

    // Simple cache to avoid duplicate API calls across sessions within the same popup
    const colorNameCache = new Map();

    const fetchColorName = async (hex) => {
        const key = hex.replace("#", "").toUpperCase();
        if (colorNameCache.has(key)) {
            return colorNameCache.get(key);
        }
        try {
            const response = await fetch(
                `https://www.thecolorapi.com/id?hex=${key}`
            );
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            const name = data.name.value;
            colorNameCache.set(key, name);
            return name;
        } catch (error) {
            console.error("Error fetching color name:", error);
            return null;
        }
    };

    const generateCSS = (baseColor, name = "color") => {
        const colors = getTintedColors(baseColor);
        const colorNameKebab = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        let css = `/* CSS variables for ${name} and its tints */\n:root {\n`;

        colors
            .filter((tint) => tint.type === "light" || tint.type === "dark")
            .forEach((tint) => {
                if (tint.hex) {
                    css += `  --${colorNameKebab}-${tint.tint}: ${tint.hex};\n`;
                }
            });

        css += `}\n\n/* Usage example:\n.element { color: var(--${colorNameKebab}-500); }\n*/`;
        return css;
    };

    const copyIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>`;

    const createColorCard = (color, name) => {
        if (color.type === "separator") {
            return `<div class="color-separator"><h2>${color.name}</h2></div>`;
        }

        const label = color.type === "suggestion" ? color.name : `Tint ${color.tint}`;
        const cardClass = color.type === "suggestion" ? "suggestion-variant" : `${color.type}-variant`;

        // The descriptive colour name is the prominent title; the tint/harmony label
        // is the small subtitle. Fall back to the label when no name was found.
        const primary = name || label;
        const secondary = name ? label : "";

        return `
            <div class="color-card ${cardClass}">
                <div class="color-card-header">
                    <div>
                        <span class="color-title">${escapeHtml(primary)}</span>
                        ${secondary ? `<span class="color-name">${escapeHtml(secondary)}</span>` : ""}
                    </div>
                    <div class="color-buttons">
                        <button class="copy-button" data-color="${color.hex}" data-type="HEX">
                            ${copyIconSvg} HEX
                        </button>
                        <button class="copy-button" data-color="${color.rgb}" data-type="RGB">
                            ${copyIconSvg} RGB
                        </button>
                        <button class="copy-button" data-color="${color.hsl}" data-type="HSL">
                            ${copyIconSvg} HSL
                        </button>
                    </div>
                </div>
                <div class="color-preview-content">
                    <div class="color-square" style="background-color: ${color.hex}">
                        ${color.type !== "suggestion" ? `<span style="color: ${color.textColor}">${color.tint}</span>` : ""}
                    </div>
                    <div class="color-values">
                        <div>${color.hex}</div>
                        <div>${color.rgb}</div>
                        <div>${color.hsl}</div>
                    </div>
                </div>
            </div>
        `;
    };

    // Combination showcase cards — illustrate how a colour pairs with a harmony
    // partner. The name is rendered in the partner colour, like the reels examples.
    const HARMONY_OFFSETS = [
        { offset: 180, label: "Complementary" },
        { offset: 120, label: "Triadic" },
        { offset: 240, label: "Triadic" },
        { offset: 150, label: "Split complementary" },
    ];

    const buildCombinations = (baseColor, baseName) => {
        const baseRgb = hexToRgb(baseColor);
        const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
        const baseIsLight = baseHsl.l >= 50;
        // Push the partner to the opposite lightness pole so the pairing always reads well.
        const partnerL = baseIsLight ? 22 : 88;
        const partnerS = Math.max(45, Math.min(95, baseHsl.s));

        const base = {
            hex: rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b),
            rgb: `rgb(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b})`,
            hsl: `hsl(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%)`,
            name: baseName,
        };

        return HARMONY_OFFSETS.map(({ offset, label }) => {
            const h = (baseHsl.h + offset) % 360;
            const pRgb = hslToRgb(h, partnerS, partnerL);
            return {
                label,
                base,
                partner: {
                    hex: rgbToHex(pRgb.r, pRgb.g, pRgb.b),
                    rgb: `rgb(${pRgb.r}, ${pRgb.g}, ${pRgb.b})`,
                    hsl: `hsl(${h}, ${partnerS}%, ${partnerL}%)`,
                    name: null,
                },
            };
        });
    };

    const comboHalf = (bg, fg) => {
        const btnStyle = `border-color: ${fg.hex}; color: ${fg.hex}`;
        return `
        <div class="combo-half" style="background-color: ${bg.hex}; color: ${fg.hex}">
            <div class="combo-name">${escapeHtml(bg.name || bg.hex)}</div>
            <div class="combo-buttons">
                <button class="copy-button combo-copy" data-color="${bg.hex}" data-type="HEX" style="${btnStyle}">${copyIconSvg} HEX</button>
                <button class="copy-button combo-copy" data-color="${bg.rgb}" data-type="RGB" style="${btnStyle}">${copyIconSvg} RGB</button>
                <button class="copy-button combo-copy" data-color="${bg.hsl}" data-type="HSL" style="${btnStyle}">${copyIconSvg} HSL</button>
            </div>
        </div>`;
    };

    const createCombinationCard = ({ label, base, partner }) => `
        <div class="combo-card">
            <div class="combo-label">${escapeHtml(label)}</div>
            ${comboHalf(base, partner)}
            ${comboHalf(partner, base)}
        </div>`;

    const showToast = (message) => {
        const toastContainer = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        toastContainer.appendChild(toast);

        toast.offsetHeight; // Force reflow

        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    const copyToClipboard = async (text, type = "", colorName = "") => {
        try {
            await navigator.clipboard.writeText(text);
            let message = "Copied to clipboard";
            if (type === "CSS") {
                message = "CSS variables copied to clipboard";
            } else if (type && colorName) {
                message = `${type} value for "${colorName}" copied`;
            } else if (type) {
                message = `${type} value copied`;
            }
            showToast(message);
        } catch (err) {
            console.error("Failed to copy text:", err);
            showToast("Failed to copy");
        }
    };

    const handleGenerate = async () => {
        let color = colorInput.value.trim();
        if (!color.startsWith("#")) {
            color = "#" + color;
        }

        if (!validateHexColor(color)) {
            showToast("Please enter a valid hex color code");
            return;
        }

        generateButton.disabled = true;
        generateButton.textContent = "Loading...";

        try {
            const mainColorName = await fetchColorName(color);

            const cssTitle = document.querySelector("#css-output-container h2");
            if (mainColorName) {
                // Build the element via DOM to avoid XSS with API-supplied data.
                // Colour name first (prominent), "Generated CSS" as the muted label.
                cssTitle.textContent = mainColorName + " ";
                const labelSpan = document.createElement("span");
                labelSpan.className = "color-name";
                labelSpan.textContent = "Generated CSS";
                cssTitle.appendChild(labelSpan);
            } else {
                cssTitle.textContent = "Generated CSS";
            }

            const tints = getTintedColors(color);

            // Look up a name for every coloured tint. Calls run in parallel and are
            // cached, so this stays fast even though it's one request per colour.
            const tintElements = await Promise.all(
                tints.map(async (tint) => {
                    let name = null;
                    if (tint.hex) {
                        name = await fetchColorName(tint.hex);
                    }
                    return createColorCard(tint, name);
                })
            );

            // Combination showcase: base colour paired with contrasting harmony partners.
            const combinations = buildCombinations(color, mainColorName);
            const partnerHexes = [...new Set(combinations.map((c) => c.partner.hex))];
            await Promise.all(partnerHexes.map(fetchColorName));
            combinations.forEach((c) => {
                c.partner.name = colorNameCache.get(
                    c.partner.hex.replace("#", "").toUpperCase()
                ) || null;
            });
            comboContainer.innerHTML =
                `<h2>Combination examples</h2><div class="combo-grid">` +
                combinations.map(createCombinationCard).join("") +
                `</div>`;

            cssOutput.textContent = generateCSS(color, mainColorName || "color");
            colorPreview.innerHTML = tintElements.join("");
            outputContainer.style.display = "block";

        } catch (error) {
            console.error("Error:", error);
            showToast("Error processing color. Please try again.");
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = "Generate";
        }
    };

    // Open external links in a new tab (required in MV3 popups)
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[target='_blank']");
        if (link) {
            e.preventDefault();
            chrome.tabs.create({ url: link.href });
        }
    }, true);

    // Event listeners
    generateButton.addEventListener("click", handleGenerate);

    colorInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleGenerate();
        }
    });

    document.addEventListener("click", (e) => {
        const button = e.target.closest(".copy-button");
        if (!button) {
            return;
        }

        if (button.id === "copy-css-button") {
            const cssText = cssOutput.textContent;
            if (cssText) {
                copyToClipboard(cssText, "CSS");
            }
            return;
        }

        const color = button.dataset.color;
        const type = button.dataset.type;
        const colorName = button
            .closest(".color-card")
            ?.querySelector(".color-name")
            ?.textContent;

        if (color && type) {
            copyToClipboard(color, type, colorName || "");
        }
    });

});
