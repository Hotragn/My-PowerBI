"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ITooltipService = powerbi.extensibility.ITooltipService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;

import { VisualFormattingSettingsModel } from "./settings";
import { FrontierPoint, computeFrontier } from "./frontier";

const MARGIN = { top: 24, right: 24, bottom: 44, left: 56 };

export class Visual implements IVisual {
    private events: IVisualEventService;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private tooltipService: ITooltipService;

    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private plotArea: d3.Selection<SVGGElement, unknown, null, undefined>;
    private sliderContainer: HTMLDivElement;
    private slider: HTMLInputElement;
    private playButton: HTMLButtonElement;
    private landingPageContainer: HTMLDivElement;

    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    private allPoints: FrontierPoint[] = [];
    private dates: Date[] = [];
    private playing: boolean = false;
    private playTimer: number | null = null;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;

        this.target.classList.add("ai-model-frontier");

        this.svg = d3.select(this.target)
            .append("svg")
            .attr("class", "frontier-svg");

        this.plotArea = this.svg.append("g").attr("class", "plot-area");

        this.sliderContainer = document.createElement("div");
        this.sliderContainer.className = "frontier-controls";
        this.target.appendChild(this.sliderContainer);

        this.playButton = document.createElement("button");
        this.playButton.className = "frontier-play";
        this.playButton.textContent = "▶";
        this.playButton.addEventListener("click", () => this.togglePlay());
        this.sliderContainer.appendChild(this.playButton);

        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.className = "frontier-slider";
        this.slider.min = "0";
        this.slider.max = "0";
        this.slider.value = "0";
        this.slider.addEventListener("input", () => this.render());
        this.sliderContainer.appendChild(this.slider);

        this.landingPageContainer = document.createElement("div");
        this.landingPageContainer.className = "frontier-landing-page";
        this.landingPageContainer.appendChild(this.buildLandingPageContent());
        this.target.appendChild(this.landingPageContainer);
    }

    private buildLandingPageContent(): DocumentFragment {
        const fragment = document.createDocumentFragment();

        const heading = document.createElement("h2");
        heading.textContent = "AI Model Frontier";
        fragment.appendChild(heading);

        const intro = document.createElement("p");
        intro.append(
            "Add a ",
            Visual.strong("Model"),
            ", a ",
            Visual.strong("Cost"),
            " and a ",
            Visual.strong("Capability score"),
            " field to get started."
        );
        fragment.appendChild(intro);

        const timelineHint = document.createElement("p");
        timelineHint.append(
            "Add a ",
            Visual.strong("Release date"),
            " field to unlock the timeline playback control."
        );
        fragment.appendChild(timelineHint);

        return fragment;
    }

    private static strong(text: string): HTMLElement {
        const element = document.createElement("strong");
        element.textContent = text;
        return element;
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);

        try {
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);

            const width = options.viewport.width;
            const height = options.viewport.height;
            this.svg.attr("width", width).attr("height", height);

            this.allPoints = this.parseDataView(options.dataViews && options.dataViews[0]);
            this.dates = Array.from(new Set(this.allPoints.filter(p => p.date).map(p => p.date.getTime())))
                .sort((a, b) => a - b)
                .map(t => new Date(t));

            const showLandingPage = this.allPoints.length === 0;
            this.landingPageContainer.style.display = showLandingPage ? "flex" : "none";
            this.svg.style("display", showLandingPage ? "none" : "block");
            if (showLandingPage) {
                this.sliderContainer.style.display = "none";
                this.events.renderingFinished(options);
                return;
            }

            const hasTimeline = this.dates.length > 1;
            this.sliderContainer.style.display = hasTimeline ? "flex" : "none";
            if (hasTimeline) {
                this.slider.max = String(this.dates.length - 1);
                if (Number(this.slider.value) > this.dates.length - 1) {
                    this.slider.value = String(this.dates.length - 1);
                }
            }

            this.render();

            this.events.renderingFinished(options);
        } catch (error) {
            console.error("AI Model Frontier: failed to render", error);
            this.events.renderingFailed(options, String(error));
        }
    }

    private parseDataView(dataView: DataView): FrontierPoint[] {
        if (!dataView || !dataView.categorical || !dataView.categorical.categories || !dataView.categorical.values) {
            return [];
        }

        const categorical = dataView.categorical;
        const categories = categorical.categories[0];
        const values = categorical.values;

        const findByRole = (role: string) => values.find(v => v.source.roles && v.source.roles[role]);
        const costColumn = findByRole("cost");
        const scoreColumn = findByRole("score");
        const dateColumn = findByRole("releaseDate");

        const points: FrontierPoint[] = [];
        for (let i = 0; i < categories.values.length; i++) {
            const cost = costColumn ? Number(costColumn.values[i]) : null;
            const score = scoreColumn ? Number(scoreColumn.values[i]) : null;
            if (cost === null || score === null || isNaN(cost) || isNaN(score)) {
                continue;
            }
            const rawDate = dateColumn ? dateColumn.values[i] : null;
            const date = rawDate ? new Date(rawDate as any) : null;

            points.push({
                name: String(categories.values[i]),
                cost,
                score,
                date: date && !isNaN(date.getTime()) ? date : null,
                onFrontier: false,
                selectionId: this.host.createSelectionIdBuilder()
                    .withCategory(categories, i)
                    .createSelectionId()
            });
        }
        return points;
    }

    private togglePlay(): void {
        this.playing = !this.playing;
        this.playButton.textContent = this.playing ? "⏸" : "▶";

        if (this.playing) {
            this.playTimer = window.setInterval(() => {
                const max = Number(this.slider.max);
                let next = Number(this.slider.value) + 1;
                if (next > max) {
                    next = 0;
                }
                this.slider.value = String(next);
                this.render();
            }, 900);
        } else if (this.playTimer !== null) {
            window.clearInterval(this.playTimer);
            this.playTimer = null;
        }
    }

    private render(): void {
        const settings = this.formattingSettings;
        const width = Number(this.svg.attr("width")) || 0;
        const height = Number(this.svg.attr("height")) || 0;

        const cutoff = this.dates.length > 0 ? this.dates[Number(this.slider.value)] : null;
        const visiblePoints = cutoff
            ? this.allPoints.filter(p => !p.date || p.date.getTime() <= cutoff.getTime())
            : this.allPoints;

        // recompute which points are non-dominated for the currently filtered slice
        visiblePoints.forEach(p => p.onFrontier = false);
        const frontierPoints = computeFrontier(visiblePoints);

        this.plotArea.selectAll("*").remove();

        if (visiblePoints.length === 0 || width <= MARGIN.left + MARGIN.right || height <= MARGIN.top + MARGIN.bottom) {
            return;
        }

        const innerWidth = width - MARGIN.left - MARGIN.right;
        const innerHeight = height - MARGIN.top - MARGIN.bottom;

        this.plotArea.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const costExtent = d3.extent(visiblePoints, d => d.cost) as [number, number];
        const scoreExtent = d3.extent(visiblePoints, d => d.score) as [number, number];

        const xScale = d3.scaleLinear()
            .domain([Math.min(0, costExtent[0]), (costExtent[1] || 1) * 1.08])
            .range([0, innerWidth])
            .nice();

        const yScale = d3.scaleLinear()
            .domain([Math.min(0, scoreExtent[0]), (scoreExtent[1] || 1) * 1.08])
            .range([innerHeight, 0])
            .nice();

        this.plotArea.append("g")
            .attr("class", "axis axis-x")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(6));

        this.plotArea.append("g")
            .attr("class", "axis axis-y")
            .call(d3.axisLeft(yScale).ticks(6));

        const frontierSorted = [...frontierPoints].sort((a, b) => a.cost - b.cost);

        if (settings.frontierCard.shadeDominatedRegion.value && frontierSorted.length > 0) {
            const extended = [...frontierSorted, { ...frontierSorted[frontierSorted.length - 1], cost: xScale.invert(innerWidth) }];

            const areaGen = d3.area<FrontierPoint>()
                .x(d => xScale(d.cost))
                .y0(innerHeight)
                .y1(d => yScale(d.score))
                .curve(d3.curveStepAfter);

            this.plotArea.append("path")
                .datum(extended)
                .attr("class", "dominated-region")
                .attr("d", areaGen)
                .attr("fill-opacity", (settings.frontierCard.shadeOpacity.value || 8) / 100);
        }

        if (settings.frontierCard.showFrontierLine.value && frontierSorted.length > 1) {
            const lineGen = d3.line<FrontierPoint>()
                .x(d => xScale(d.cost))
                .y(d => yScale(d.score))
                .curve(d3.curveStepAfter);

            this.plotArea.append("path")
                .datum(frontierSorted)
                .attr("class", "frontier-line")
                .attr("d", lineGen)
                .attr("stroke", settings.frontierCard.frontierLineColor.value.value)
                .attr("fill", "none");
        }

        const pointRadius = settings.dataPointCard.pointRadius.value || 6;
        const self = this;

        const pointGroups = this.plotArea.selectAll(".model-point")
            .data(visiblePoints)
            .enter()
            .append("g")
            .attr("class", "model-point")
            .attr("transform", d => `translate(${xScale(d.cost)},${yScale(d.score)})`);

        pointGroups.append("circle")
            .attr("r", pointRadius)
            .attr("fill", d => d.onFrontier
                ? settings.dataPointCard.onFrontierColor.value.value
                : settings.dataPointCard.dominatedColor.value.value)
            .on("mouseover", function (event: MouseEvent, d: FrontierPoint) {
                self.showTooltip(event, d);
            })
            .on("mouseout", () => this.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, d: FrontierPoint) => {
                self.selectionManager.select(d.selectionId, event.ctrlKey || event.metaKey);
                event.stopPropagation();
            });

        if (settings.dataPointCard.showLabels.value) {
            pointGroups.append("text")
                .attr("class", "model-label")
                .attr("x", pointRadius + 4)
                .attr("y", 4)
                .text(d => d.name);
        }

        this.svg.on("click", () => this.selectionManager.clear());
    }

    private showTooltip(event: MouseEvent, d: FrontierPoint): void {
        this.tooltipService.show({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            identities: [d.selectionId],
            dataItems: [
                { displayName: "Model", value: d.name },
                { displayName: "Cost", value: String(d.cost) },
                { displayName: "Capability score", value: String(d.score) },
                { displayName: "On efficiency frontier", value: d.onFrontier ? "Yes" : "No" },
                ...(d.date ? [{ displayName: "Release date", value: d.date.toLocaleDateString() }] : [])
            ]
        });
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
