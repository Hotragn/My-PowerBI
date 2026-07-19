"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Controls how individual model points are drawn.
 */
class DataPointCardSettings extends FormattingSettingsCard {
    onFrontierColor = new formattingSettings.ColorPicker({
        name: "onFrontierColor",
        displayName: "Frontier model color",
        value: { value: "#118DFF" }
    });

    dominatedColor = new formattingSettings.ColorPicker({
        name: "dominatedColor",
        displayName: "Dominated model color",
        value: { value: "#B3B3B3" }
    });

    pointRadius = new formattingSettings.NumUpDown({
        name: "pointRadius",
        displayName: "Point radius",
        value: 6
    });

    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels",
        displayName: "Show model labels",
        value: true
    });

    name: string = "dataPoint";
    displayName: string = "Data points";
    slices: Array<FormattingSettingsSlice> = [this.onFrontierColor, this.dominatedColor, this.pointRadius, this.showLabels];
}

/**
 * Controls the Pareto frontier line and dominated-region shading.
 */
class FrontierCardSettings extends FormattingSettingsCard {
    showFrontierLine = new formattingSettings.ToggleSwitch({
        name: "showFrontierLine",
        displayName: "Show frontier line",
        value: true
    });

    frontierLineColor = new formattingSettings.ColorPicker({
        name: "frontierLineColor",
        displayName: "Frontier line color",
        value: { value: "#EE7A00" }
    });

    shadeDominatedRegion = new formattingSettings.ToggleSwitch({
        name: "shadeDominatedRegion",
        displayName: "Shade dominated region",
        value: true
    });

    shadeOpacity = new formattingSettings.NumUpDown({
        name: "shadeOpacity",
        displayName: "Shade opacity (%)",
        value: 8
    });

    name: string = "frontier";
    displayName: string = "Efficiency frontier";
    slices: Array<FormattingSettingsSlice> = [this.showFrontierLine, this.frontierLineColor, this.shadeDominatedRegion, this.shadeOpacity];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    dataPointCard = new DataPointCardSettings();
    frontierCard = new FrontierCardSettings();

    cards = [this.dataPointCard, this.frontierCard];
}
