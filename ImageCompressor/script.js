// Global elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const hiddenFileInput = document.getElementById('hidden-file-input');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const mobileResultsCarousel = document.getElementById('mobile-results-carousel');
const fileCountSpan = document.getElementById('file-count');
const progressBar = document.getElementById('progress-bar');
const progressIndicator = document.getElementById('progress-indicator');
const toastContainer = document.getElementById('toast-container');

// Modal elements
const messageBoxModal = document.getElementById('message-box-modal');
const messageTitle = document.getElementById('message-title');
const messageBody = document.getElementById('message-body');
const messageContent = document.getElementById('message-content');

// Header link elements
const privacyLink = document.getElementById('privacy-link');
const aboutLink = document.getElementById('about-link');

// --- Message Box Functions ---

/**
* Shows a custom message box/modal with the given title and content.
* @param {string} title
* @param {string} content
*/
const showMessageBox = (title, content) => {
    messageTitle.textContent = title;
    messageBody.textContent = content;

    // Show modal and enable transitions
    messageBoxModal.classList.remove('pointer-events-none', 'opacity-0');
    messageBoxModal.classList.add('opacity-100');

    // Animate content in
    setTimeout(() => {
        messageContent.classList.remove('translate-y-4');
    }, 50);
};

/**
* Hides the custom message box/modal.
*/
const hideMessageBox = () => {
    // Animate content out
    messageContent.classList.add('translate-y-4');

    // Hide modal and disable interaction
    setTimeout(() => {
        messageBoxModal.classList.remove('opacity-100');
        messageBoxModal.classList.add('opacity-0', 'pointer-events-none');
    }, 300);
};

// Close modal when clicking outside the content area
messageBoxModal.addEventListener('click', (e) => {
    if (e.target === messageBoxModal) {
        hideMessageBox();
    }
});

// --- Utility Functions ---

/**
* Converts bytes to a human-readable string (e.g., 1024 -> 1.0 KB).
* @param {number} bytes
* @returns {string}
*/
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
* Creates and shows a temporary toast notification.
* @param {string} message
* @param {string} type ('success' or 'error')
*/
const showToast = (message, type = 'success') => {
    const colors = {
        success: { bg: 'bg-green-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        error: { bg: 'bg-red-500', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' }
    };

    const toast = document.createElement('div');
    toast.className = `${colors[type].bg} text-white px-4 py-3 rounded-lg shadow-xl flex items-center transition duration-300 transform translate-x-full opacity-0`;
    toast.innerHTML = `
    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${colors[type].icon}"></path>
    </svg>
    <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translate-x-0';
        toast.style.opacity = '1';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.transform = 'translate-x-full';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

// --- Core Image Compression Logic ---

/**
* Compresses a single file using resize and aggressive quality settings.
* @param {File} file
* @returns {Promise<{compressedDataUrl: string, compressedBlob: Blob, compressedSize: number}>}
*/
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const originalDataUrl = event.target.result;
            const originalSize = file.size;

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // Resize Logic (Max 1920px)
                const MAX_DIMENSION = 1920;
                let { width, height } = img;

                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                    canvas.width = width * ratio;
                    canvas.height = height * ratio;
                } else {
                    canvas.width = width;
                    canvas.height = height;
                }

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                let mimeType, quality;

                // Aggressive Quality/Format Logic (0.25)
                if (file.type === 'image/jpeg') {
                    mimeType = 'image/jpeg';
                    quality = 0.25;
                } else if (file.type === 'image/png') {
                    mimeType = 'image/webp';
                    quality = 0.25;
                } else if (file.type === 'image/webp') {
                    mimeType = 'image/webp';
                    quality = 0.25;
                } else {
                    return reject(new Error('Unsupported file format.'));
                }

                // Get compressed data URL
                const compressedDataUrl = canvas.toDataURL(mimeType, quality);

                // Convert compressed data URL to Blob
                const parts = compressedDataUrl.split(';base64,');
                const contentType = parts[0].split(':')[1];
                const raw = window.atob(parts[1]);
                const rawLength = raw.length;
                const uInt8Array = new Uint8Array(rawLength);
                for (let i = 0; i < rawLength; ++i) {
                    uInt8Array[i] = raw.charCodeAt(i);
                }
                const compressedBlob = new Blob([uInt8Array], { type: contentType });
                const compressedSize = compressedBlob.size;

                // Size Guarantee Fallback
                if (compressedSize >= originalSize) {
                    resolve({
                        compressedDataUrl: originalDataUrl,
                        compressedBlob: file,
                        compressedSize: originalSize
                    });
                } else {
                    resolve({ compressedDataUrl, compressedBlob, compressedSize });
                }

            };
            img.onerror = () => reject(new Error('Failed to load image.'));
            img.src = originalDataUrl;
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
};

// --- UI Generation & Download ---

/**
* Creates a result card for a compressed image.
* @param {File} originalFile
* @param {string} finalDataUrl
* @param {number} finalSize
* @param {Blob} finalBlob
* @returns {HTMLElement}
*/
const createResultCard = (originalFile, finalDataUrl, finalSize, finalBlob) => {
    const originalSize = originalFile.size;
    const originalFormat = originalFile.name.split('.').pop();

    let reductionText = '';
    let reductionClass = '';
    let fileName = originalFile.name.replace(/\.[^/.]+$/, "");

    const isWebP = finalBlob.type.includes('webp');
    const finalExtension = isWebP ? 'webp' : originalFormat;

    const reductionPercentage = (finalSize / originalSize) * 100;

    if (finalSize < originalSize) {
        const reduction = 100 - reductionPercentage;
        reductionText = `-${reduction.toFixed(1)}% Reduction`;
        reductionClass = 'bg-green-100 text-green-700';
        fileName = `${fileName}_compressed.${finalExtension}`;
    } else {
        reductionText = `0% Reduction (Used Original)`;
        reductionClass = 'bg-yellow-100 text-yellow-700';
        fileName = originalFile.name;
    }

    const downloadUrl = URL.createObjectURL(finalBlob);

    const card = document.createElement('div');
    card.className = 'result-card glass-card p-6 transition duration-300 hover:scale-[1.03]';
    card.innerHTML = `
    <img src="${finalDataUrl}" alt="Compressed Preview" class="w-full h-24 sm:h-32 object-contain rounded-lg mb-4 lazyload">

    <p class="file-name text-sm font-semibold text-gray-800">${originalFile.name}</p>

    <div class="file-info">
        <span>
            <span class="text-xs text-gray-500">Original</span>
            <strong class="text-gray-700">${formatBytes(originalSize)}</strong>
        </span>
        <span>
            <span class="text-xs text-gray-500">Final</span>
            <strong class="text-indigo-800">${formatBytes(finalSize)}</strong>
        </span>
    </div>

    <div class="w-full h-3 bg-indigo-200 rounded-full flex file-size-bar mb-4">
        <div class="bg-indigo-600 h-3 rounded-full transition-all duration-500" style="width: ${Math.min(reductionPercentage, 100)}%;"></div>
    </div>

    <div class="mb-4 text-sm font-bold p-1 px-3 rounded-full ${reductionClass}">
        ${reductionText}
    </div>

    <button data-url="${downloadUrl}" data-filename="${fileName}" class="download-btn text-white font-semibold py-2 px-6 rounded-full w-full transition duration-150 shadow-md mt-auto">
        Download
    </button>
    `;

    // Attach download listener
    const downloadButton = card.querySelector('.download-btn');
    downloadButton.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        const name = e.currentTarget.getAttribute('data-filename');

        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`'${name}' downloaded successfully!`);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    return card;
};

// --- Event Handlers ---

// Event listeners for Privacy and About links
privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    showMessageBox(
        'Our Privacy Promise',
        'We respect your privacy. All images are processed directly in your browser, so nothing is uploaded or stored online. Your files stay safe and private.'
    );
});

aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    showMessageBox(
        'About ImageCompressor',
        'Shrink your images instantly with smart resizing and compression. Works with JPG, PNG, and WebP for fast, high-quality results.'
    );
});

/**
* Initiates the compression process for all selected files.
* @param {FileList} files
*/
const processFiles = async (files) => {
    // Clear previous results
    resultsContainer.innerHTML = '';
    mobileResultsCarousel.innerHTML = '';
    resultsSection.classList.add('hidden');

    // Filter unsupported files
    const supportedFiles = Array.from(files).filter(file =>
        file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
    );

    if (supportedFiles.length === 0) {
        if (files.length > 0) {
            showToast('None of the selected files are supported (JPG, PNG, WebP).', 'error');
        }
        return;
    }

    resultsSection.classList.remove('hidden');
    progressIndicator.classList.remove('hidden');
    fileCountSpan.textContent = supportedFiles.length;

    let completedCount = 0;

    for (const file of supportedFiles) {
        try {
            const { compressedDataUrl, compressedBlob, compressedSize } = await compressImage(file);

            // Create card once
            const desktopCard = createResultCard(file, compressedDataUrl, compressedSize, compressedBlob);

            // For mobile, use the same card but with full width
            const mobileCard = desktopCard.cloneNode(true);
            mobileCard.classList.add('mobile-carousel-card', 'w-full');

            // Append to respective containers
            resultsContainer.appendChild(desktopCard);
            mobileResultsCarousel.appendChild(mobileCard);

            completedCount++;
            progressBar.style.width = `${(completedCount / supportedFiles.length) * 100}%`;
        } catch (error) {
            console.error('Compression failed for file:', file.name, error);
            showToast(`Compression failed for ${file.name}. Error: ${error.message}`, 'error');
            completedCount++;
            progressBar.style.width = `${(completedCount / supportedFiles.length) * 100}%`;
        }
    }

    progressIndicator.classList.add('hidden');
    showToast(`Batch compression complete! ${completedCount} images ready for download.`);

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- Setup Listeners (File Upload) ---

// Click-to-Upload Listener
dropArea.addEventListener('click', () => {
    hiddenFileInput.click();
});

// File Input Change Listener
hiddenFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        processFiles(e.target.files);
    }
});

// Drag & Drop Listeners
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight effect on dragover
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('border-indigo-600/90', 'scale-[1.02]');
        dropArea.classList.remove('border-indigo-300/50', 'scale-[1.00]');
    }, false);
});

// Remove highlight on dragleave/drop
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('border-indigo-600/90', 'scale-[1.02]');
        dropArea.classList.add('border-indigo-300/50', 'scale-[1.00]');
    }, false);
});

// Handle dropped files
dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    processFiles(files);
}, false);

// --- FAQ Toggle Logic ---
document.querySelectorAll('#faqs .glass-card').forEach(card => {
    card.addEventListener('click', () => {
        const answer = card.querySelector('p');
        const icon = card.querySelector('svg');

        answer.classList.toggle('hidden');

        if (answer.classList.contains('hidden')) {
            icon.style.transform = 'rotate(0deg)';
        } else {
            icon.style.transform = 'rotate(180deg)';
        }
    });
});