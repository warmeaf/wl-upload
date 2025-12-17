import {
  FileUploader,
  type ProgressInfo,
  type UploadStatus,
} from "../../packages/client/src/index";

// API endpoint - use relative path for Vite proxy in development
// In production, set this to your actual API server URL
const API_BASE_URL = "/api";

// Initialize FileUploader
const fileUploader = new FileUploader({
  config: {
    baseUrl: API_BASE_URL,
    chunkSize: 1024 * 1024 * 5, // 5MB chunks
    concurrency: 3,
    enableMultiThreading: true,
  },
  onProgress: (progress: ProgressInfo) => {
    const percentage = Math.round((progress.chunksUploaded / progress.totalChunks) * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% (${progress.chunksUploaded}/${progress.totalChunks} chunks)`;
  },
  onStatusChange: (status: UploadStatus) => {
    updateUploadStatus(status);
  },
});

// DOM elements
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
const cancelButton = document.getElementById("cancelButton") as HTMLButtonElement;
const progressFill = document.getElementById("progressFill") as HTMLDivElement;
const progressText = document.getElementById("progressText") as HTMLDivElement;
const errorMessage = document.getElementById("errorMessage") as HTMLDivElement;
const successMessage = document.getElementById("successMessage") as HTMLDivElement;
const fileList = document.getElementById("fileList") as HTMLDivElement;

// Track current upload
let currentFile: File | null = null;
let uploadStatus: UploadStatus = "idle";

// Event listeners
uploadButton.addEventListener("click", handleUpload);
cancelButton.addEventListener("click", handleCancel);

async function handleUpload() {
  const files = fileInput.files;
  if (!files || files.length === 0) {
    showError("Please select a file to upload");
    return;
  }

  currentFile = files[0]; // For demo, upload first file only
  hideMessages();
  uploadButton.disabled = true;
  cancelButton.disabled = false;

  try {
    // Start upload
    const url = await fileUploader.upload(currentFile);
    showSuccess(`File uploaded successfully! URL: ${url}`);
    updateFileList();
  } catch (error) {
    showError(`Upload failed: ${(error as Error).message}`);
  } finally {
    resetButtons();
  }
}

function handleCancel() {
  fileUploader.abort();
  resetButtons();
  showError("Upload cancelled");
}

function updateUploadStatus(status: UploadStatus) {
  uploadStatus = status;
  const statusDiv = document.getElementById("uploadStatus") as HTMLDivElement;
  if (statusDiv) {
    statusDiv.textContent = `Status: ${status}`;
  }
}

function updateFileList() {
  fileList.innerHTML = "<h3>Upload Status</h3>";

  if (currentFile) {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";

    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    fileInfo.innerHTML = `
      <div><strong>${currentFile.name}</strong> (${formatFileSize(currentFile.size)})</div>
    `;

    const fileStatus = document.createElement("div");
    fileStatus.className = `file-status status-${uploadStatus}`;
    fileStatus.textContent = uploadStatus.toUpperCase();

    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileStatus);
    fileList.appendChild(fileItem);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function resetButtons() {
  uploadButton.disabled = false;
  cancelButton.disabled = true;
}

function showError(message: string) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

function showSuccess(message: string) {
  successMessage.textContent = message;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}

function hideMessages() {
  errorMessage.style.display = "none";
  successMessage.style.display = "none";
}

// Initialize
resetButtons();
progressFill.style.width = "0%";
progressText.textContent = "0%";
