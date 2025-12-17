let canvas = hCaptchaMenu = turnstileMenu = undefined;
let canvasCtx = palette = placement = template = undefined;
let paletteTimeout = turnstileTimeout = noGameTimeout = undefined;
let mainInterval = failInterval = undefined;
let cooledDown = false;
let failCount = 0;

const position = {x: undefined, y: undefined};
const lockIn = {x: undefined, y: undefined};

noGameTimeout = setTimeout(() => chrome.runtime.sendMessage("restart"), 45000);

window.addEventListener("palette", async (paletteEvent) => {
	clearTimeout(noGameTimeout);

	paletteTimeout = setTimeout(async () => {
		canvas = document.querySelector("#canvas");
		canvasCtx = canvas.getContext("2d", {willReadFrequently: true});
		hCaptchaMenu = document.querySelector("#hCaptchaMenu");
		turnstileMenu = document.querySelector("#turnstileMenu");
		placement = await fetch(chrome.runtime.getURL("placement.json"));
		placement = await placement.text();
		placement = JSON.parse(placement);

		const img = new Image();

		img.src = chrome.runtime.getURL("template.png");

		await img.decode();

		const tempCanvas = document.createElement("canvas");

		tempCanvas.width = img.width;
		tempCanvas.height = img.height;

		const tempCanvasCtx = tempCanvas.getContext("2d");

		tempCanvasCtx.drawImage(await createImageBitmap(img), 0, 0)

		template = new DataView(tempCanvasCtx.getImageData(0, 0, img.width, img.height).data.buffer);
		palette = new Map();

		for (const colourEl of document.querySelector("#colours").children) {
			colour = colourEl.style.background.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d\.]+))?/).slice(1).map((channel) => parseFloat(channel ?? 1));
			palette.set((colour[0] << 24 | colour[1] << 16 | colour[2] << 8 | Math.round(colour[3] * 255)) >>> 0, colourEl.firstChild.textContent);
		}

		for (let i = 0; i < template.byteLength; i += 4) {
			let colour = template.getUint32(i);

			if (palette.has(colour) || (colour & 0xFF) != 0xFF)
				continue;

			const pColour = [];

			for (const c of palette) {
				const coldiff = Math.abs((c[0] >> 24) - (colour >> 24)) + Math.abs(((c[0] & 0xFF0000) >> 16) - ((colour & 0xFF0000) >> 16)) + Math.abs(((c[0] & 0xFF00) >> 8) - ((colour & 0xFF00) >> 8)) + Math.abs((c[0] & 0xFF) - (colour & 0xFF));

				if (!pColour.length || coldiff <= pColour[0]) {
					pColour[0] = coldiff;
					pColour[1] = c[0];
				}
			}

			template.setUint32(i, pColour[1]);
		}

		chrome.runtime.sendMessage("move-right");
		chrome.runtime.sendMessage("move-left");

		mainInterval = setInterval(async () => {
			if (placement.unattended) {
				if (hCaptchaMenu.getAttribute("open")) {
					chrome.runtime.sendMessage("restart");

					return;
				}

				if (turnstileMenu.getAttribute("open")) {
					if (turnstileTimeout === undefined)
						turnstileTimeout = setTimeout(() => chrome.runtime.sendMessage("restart"), 45000);

					return;
				} else if (turnstileTimeout !== undefined) {
					clearTimeout(turnstileTimeout);

					turnstileTimeout = undefined;
				}
			} else if (hCaptchaMenu.getAttribute("open") || turnstileMenu.getAttribute("open"))
				return;

			const canvasView = new DataView(canvasCtx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);

			if (lockIn.x === undefined) {
				switch (placement.method) {
					case "nearest-spiral":
						const x = Math.min(Math.max(position.x - placement.x, 0), img.width - 1);
						const y = Math.min(Math.max(position.y - placement.y, 0), img.height - 1);

						findCoord: for (let r = 0; x + r < img.width || x - r >= 0 || y + r < img.height || y - r >= 0; r++) {
							const sx = x - r, sy = y - r;

							let cx = sx, cy = sy;

							do {
								if (img.width > cx && cx >= 0 && img.height > cy && cy >= 0) {
									if ((template.getUint32(4 * (cy * img.width + cx)) & 0xFF) === 0xFF && template.getUint32(4 * (cy * img.width + cx)) !== canvasView.getUint32(4 * ((cy + placement.y) * canvas.width + cx + placement.x))) {
										lockIn.x = cx + placement.x;
										lockIn.y = cy + placement.y;

										break findCoord;
									}
								}

								if (cy === y - r && cx < x + r)
									cx++;
								else if (cy === y + r && cx > x - r)
									cx--;
								else if (cx === x + r && cy < y + r)
									cy++;
								else if (cx === x - r && cy > y - r)
									cy--;
							} while (cx !== sx || cy !== sy)
						}

						break;
					case "linear":
					default:
						findCoord: for (let y = 0; y < img.height; y++) {
							for (let x = 0; x < img.width; x++) {
								if ((template.getUint32(4 * (y * img.width + x)) & 0xFF) === 0xFF && template.getUint32(4 * (y * img.width + x)) !== canvasView.getUint32(4 * ((y + placement.y) * canvas.width + x + placement.x))) {
									lockIn.x = x + placement.x;
									lockIn.y = y + placement.y;

									break findCoord;
								}
							}
						}
				}
			}

			if (lockIn.x !== undefined) {
				if (template.getUint32(4 * ((lockIn.y - placement.y) * img.width + lockIn.x - placement.x)) === canvasView.getUint32(4 * (lockIn.y * canvas.width + lockIn.x))) {
					lockIn.x = lockIn.y = undefined;
				} else {
					const xdiff = lockIn.x - position.x, ydiff = lockIn.y - position.y;

					if (document.activeElement !== document.body)
						document.activeElement.blur();

					if (xdiff || ydiff) {
						for (let i = 0; i < Math.min(Math.abs(xdiff), 1); i++)
							chrome.runtime.sendMessage(`move-${xdiff > 0 ? "right" : "left"}`)

						for (let i = 0; i < Math.min(Math.abs(ydiff), 1); i++)
							chrome.runtime.sendMessage(`move-${ydiff > 0 ? "down" : "up"}`)
					} else if (!cooledDown) {
						chrome.runtime.sendMessage(`push-${palette.get(template.getUint32(4 * ((lockIn.y - placement.y) * img.width + lockIn.x - placement.x)))}`);
						chrome.runtime.sendMessage("push-enter");
					}
				}
			}
		}, 111);
	});
});

window.addEventListener("disconnect", async (paletteEvent) => {
	if (paletteTimeout !== undefined) {
		clearTimeout(paletteTimeout);

		paletteTimeout = undefined;
	}

	if (mainInterval !== undefined) {
		clearInterval(mainInterval);

		mainInterval = undefined;
	}

	if (turnstileTimeout !== undefined) {
		clearTimeout(turnstileTimeout);

		turnstileTimeout = undefined;
	}

	if (failInterval !== undefined) {
		clearInterval(failInterval);

		failInterval = undefined;
	}

	chrome.runtime.sendMessage("restart");
});

window.addEventListener("cooldownstart", async (cooldownStartEvent) => {
	cooledDown = cooldownStartEvent.detail.onCooldown;
});

window.addEventListener("cooldownend", async (cooldownEndEvent) => {
	cooledDown = cooldownEndEvent.detail.onCooldown;
});

window.addEventListener("pos", async (posEvent) => {
	position.x = Math.floor(posEvent.detail.x);
	position.y = Math.floor(posEvent.detail.y);
});

window.addEventListener("rejectedpixel", async (pixelsEvent) => {
	if (++failCount === 3)
		chrome.runtime.sendMessage("restart");
});

failInterval = setInterval(() => {
	if (failCount > 0)
		failCount--;
}, 1000);