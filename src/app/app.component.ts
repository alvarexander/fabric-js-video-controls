import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as fabric from 'fabric';

@Component({
    selector: 'app-root',
    imports: [FormsModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})

export class AppComponent implements AfterViewInit {
    @ViewChild('canvas', {static: true}) canvasRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('controls', {static: true}) controlsRef?: ElementRef<HTMLDivElement>;
    @ViewChild('scrubber', {static: true}) scrubberRef?: ElementRef<HTMLInputElement>;
    @ViewChild('loopButton', {static: true}) loopBtnRef?: ElementRef<HTMLButtonElement>;

    @Input()videoElement: HTMLVideoElement = {} as HTMLVideoElement;
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

    setupCanvas(): void {
        this.canvas = new fabric.Canvas(this.canvasRef?.nativeElement, {
            width: 1920,
            height: 1080,
        });

        // Create a video element
        this.videoElement = document.createElement('video');
        this.videoElement.crossOrigin = 'anonymous';
        this.videoElement.height = 1080;
        this.videoElement.width = 1920;
        this.videoElement.src = 'https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4';


        this.videoElement.onloadedmetadata = () => {
            this.videoDuration = this.videoElement?.duration;
            this.videoDurationLabel = this._formatTime(this.videoDuration);
        };

        this.videoElement.onended = () => {
            this.isPlaying = false;
        }

        // Fabric image object from Video
        this.videoObject = new fabric.Image(this.videoElement, {
            left: 100,
            top: 100,
            objectFit: 'contain',
            objectCaching: false,
            selectable: true,
            hasControls: true,
        });

        this.videoObject.scaleToHeight(1920);
        this.videoObject.scaleToWidth(1080);

        // Add video object to canvas
        this.canvas.add(this.videoObject);

        // Set initial control position
        this.updateControlsPosition();

        // Make controls visible by default
        this._toggleControlVisibility('visible');

        // Update scrubber position during canvas events
        this.canvas.on('object:moving', this.updateControlsPosition.bind(this));
        this.canvas.on('mouse:up', () => this._toggleControlVisibility('visible'));
        this.canvas.on('object:scaling', this.updateControlsPosition.bind(this));

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
                // Update the gradient dynamically
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
        this.canvas.requestRenderAll();
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
            scrubber.style.background = 'linear-gradient(to right, rgb(180, 180, 180) 0%, rgb(180, 180, 180) ' + value + '%, rgb(103,112,106)' + value + '%, rgb(103,112,106) 100%)';
            this.videoElement.currentTime = parseFloat(scrubber.value);
            this.currentTime = this.videoElement?.currentTime;
            this.currentTimeLabel = this._formatTime(this.currentTime);
        }

        this.canvas.requestRenderAll();
    }

    /**
     * Updates the position of the control element, relative to the corresponding fabric video object.
     */
    updateControlsPosition(): void {
        const fabricImgObj = this.videoObject;
        const controlsElement = this.controlsRef?.nativeElement;
        this._toggleControlVisibility('hidden');
        if (controlsElement) {
            controlsElement.style.width = `${ fabricImgObj.width * fabricImgObj.scaleX - 5 }px`;
            controlsElement.style.left = `${ fabricImgObj.left }px`;
            controlsElement.style.top = `${ fabricImgObj.top + fabricImgObj.height * fabricImgObj.scaleY + 5 }px`;
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
