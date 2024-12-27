import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as fabric from 'fabric';

@Component({
    selector: 'app-root',
    imports: [FormsModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})

export class AppComponent implements AfterViewInit, OnDestroy {
    @ViewChild('canvas', {static: true}) canvasRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('controls', {static: true}) controlsRef?: ElementRef<HTMLDivElement>;
    @ViewChild('scrubber', {static: true}) scrubberRef?: ElementRef<HTMLInputElement>;
    @ViewChild('loopButton', {static: true}) loopBtnRef?: ElementRef<HTMLButtonElement>;

    /**
     * Note: This property is designed as an input to allow external components to manage the control display.
     * Ideally, only one control should be visible at a time for the currently selected or active video in the canvas.
     * The parent component can track and update the video element and its positioning (e.g., top, left, width).
     * In this example, these dimensions are calculated locally within this component, but they can be passed as an input
     * from an external component if desired (e.g., @Input() controlConfig: { top: number, left: number, width: number }).
     */
    @Input() videoElement: HTMLVideoElement = {} as HTMLVideoElement;
    canvas: fabric.Canvas = {} as fabric.Canvas;
    videoObject: fabric.Image = {} as fabric.Image;

    // Video Controls State
    isPlaying: boolean = false;
    videoDuration: number = 0;
    currentTime: number = 0;
    currentTimeLabel: string = '00:00:00';
    videoDurationLabel: string = '00:00:00';
    loop: boolean = false;

    constructor() {
    }


    ngAfterViewInit(): void {
        this.setupCanvas();
    }

    ngOnDestroy(): void {
        this.canvas.removeListeners();
        this.canvas.dispose();
    }

    /**
     * Initializes the canvas element with a Fabric.js canvas instance and sets up
     * a video element as a Fabric.js image object on the canvas. The method configures
     * the video playback, canvas controls, and frame rendering to allow for
     * interaction with video elements on the canvas.
     */
    setupCanvas(): void {
        this.canvas = new fabric.Canvas(this.canvasRef?.nativeElement, {
            width: 1920,
            height: 1080,
        });

        // Create a video element
        this.videoElement = document.createElement('video');
        this.videoElement.crossOrigin = 'anonymous';
        this.videoElement.muted = true;
        this.videoElement.height = 1080;
        this.videoElement.width = 1920;
        this.videoElement.src = 'https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4';


        // Load video meta data to properly set duration
        this.videoElement.onloadedmetadata = () => {
            this.videoDuration = this.videoElement?.duration;
            this.videoDurationLabel = this._formatTime(this.videoDuration);
        };

        // Update component state anytime playback ends
        this.videoElement.onended = () => {
            this.isPlaying = false;
        }

        // Fabric image object from Video
        // Note the top, left and scale may need to be manually calculated depending on use-case
        this.videoObject = new fabric.Image(this.videoElement, {
            left: this.canvas.getWidth() / 5,
            top: this.canvas.getHeight() / 5,
            scaleY: 0.3,
            scaleX: 0.3,
            objectCaching: false,
            selectable: true,
            hasControls: true,
        });

        // Add video object to canvas
        this.canvas.add(this.videoObject);

        // Start playing the video (optional but recommended)
        this.playPauseVideo();

        // Set initial control position
        this._updateControlsPosition();

        // Make controls visible by default
        this._toggleControlVisibility('visible');

        // Update scrubber position during canvas events
        this.canvas.on('mouse:up', () => this._toggleControlVisibility('visible'));
        this.canvas.on('object:moving', () => this._updateControlsPosition());
        this.canvas.on('object:scaling', () => this._updateControlsPosition());
        this.canvas.on('object:rotating', () => this._updateControlsPosition());

        // Start rendering the video frames
        this.renderVideoFrame();
    }

    /**
     * Request animation frames from fabricJS. Used to make video element play.
     */
    renderVideoFrame(): void {
        const render = () => {
            if (this.isPlaying) {
                this.videoObject.setElement(this.videoElement);
                // Update the gradient dynamically to keep up with current place in video
                // Note: this part optional and can be done in other ways such as css, etc.
                const scrubber = this.scrubberRef?.nativeElement;
                if (scrubber) {
                    const value = (this.videoElement.currentTime / this.videoDuration) * 100;
                    scrubber.style.background = `linear-gradient(to right, rgb(180, 180, 180) 0%, rgb(180, 180, 180) ${ value }%, rgb(103,112,106) ${ value }%, rgb(103,112,106) 100%)`;
                }
                this.canvas.requestRenderAll();
                this.currentTime = this.videoElement.currentTime;
                this.currentTimeLabel = this._formatTime(this.currentTime);
            }
            fabric.util.requestAnimFrame(render);
        };
        render();
    }

    /**
     * Plays or pauses the video depending on current element state
     */
    playPauseVideo(): void {
        if (this.videoElement.paused) {
            this.videoElement.play();
        } else {
            this.videoElement.pause();
        }
        this.renderVideoFrame();
        this.isPlaying = !this.isPlaying;
    }

    /**
     * Changes loop setting on video element
     */
    changeLoopSetting(): void {
        this.videoElement.loop = !this.videoElement.loop;
        this.loop = this.videoElement.loop;
        this.canvas.requestRenderAll();
    }

    /**
     * Event to handle scrubber change in order to update the current time and bar color.
     */
    onScrubberChange(): void {
        const scrubber = this.scrubberRef?.nativeElement;
        if (scrubber) {
            const value = parseFloat(scrubber.value) / parseFloat(scrubber.max) * 100;
            // Update the gradient dynamically to keep up with current place in video
            // Note: this part optional and can be done in other ways such as css, etc.
            scrubber.style.background = 'linear-gradient(to right, rgb(180, 180, 180) 0%, rgb(180, 180, 180) ' + value + '%, rgb(103,112,106)' + value + '%, rgb(103,112,106) 100%)';
            this.videoElement.currentTime = parseFloat(scrubber.value);
            this.currentTime = this.videoElement?.currentTime;
            this.currentTimeLabel = this._formatTime(this.currentTime);
        }

        this.canvas.requestRenderAll();
    }

    /**
     * Updates the position of the control element, relative to the corresponding fabric video object.
     * Note: if in any way there are modifications made to the canvas size or zoom for things such as
     * aspect ratio, or screen size changes you may need to use the canvas bounds in the calculations as well.
     */
    private _updateControlsPosition(): void {
        const videoFabricObj = this.videoObject;
        const controlsElement = this.controlsRef?.nativeElement;
        // Hide controls while fabric object is being manipulated/moved (optional)
        this._toggleControlVisibility('hidden');
        // Minimum amount of width the controls require to not overflow or wrap (can change depending on style)
        const MIN_CONTROL_WIDTH = 340;
        // Extra space to put the controls visually slightly below the controls
        const CONTROL_OFFSET = 5;
        // Get the bounding box of the video fabric object
        const boundingRect = videoFabricObj.getBoundingRect();
        // Determine control width: Use the video width or the minimum width
        const controlWidth = Math.max(boundingRect.width, MIN_CONTROL_WIDTH);
        // Calculate the top position: place the controls just below the video
        const controlTop = (boundingRect.top) + (boundingRect.height) + CONTROL_OFFSET;
        // Calculate the left position: center horizontally with respect to the bounding box
        const controlLeft = boundingRect.left + ((boundingRect.width / 2) - (controlWidth / 2));

        if (controlsElement) {
            controlsElement.style.width = `${ controlWidth }px`;
            controlsElement.style.left = `${ controlLeft }px`;
            controlsElement.style.top = `${ controlTop }px`;
        }
    }

    /**
     * Formats a given time (in seconds) into hh:mm:ss format
     * @param seconds The total number of seconds to format
     * @returns A string representing seconds in hh:mm:ss format
     */
    private _formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        // Pad hours, minutes, and seconds to ensure two digits
        const hh = hours.toString().padStart(2, '0');
        const mm = minutes.toString().padStart(2, '0');
        const ss = secs.toString().padStart(2, '0');

        return `${ hh }:${ mm }:${ ss }`;
    }

    /**
     * Toggles visibility of the control bar. To be used when scaling and moving.
     * @param styleVal The value of the visibility property in css, either 'hidden' or 'visible'
     */
    private _toggleControlVisibility(styleVal: 'hidden' | 'visible' | string = 'visible') {
        const controlsElement = this.controlsRef?.nativeElement;
        if (controlsElement) {
            controlsElement.style.visibility = styleVal;
        }
    }
}
