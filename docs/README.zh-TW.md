# Oto

起初基於 Whisper，現在使用 **OpenAI GPT Transcribe API** 的一個 macOS 語音輸入小 App。按一下觸發鍵開始說話，再按一下，就把文字貼進目前使用的 App。

我平常開發時滿常用語音輸入，也很喜歡 Typeless，所以想試著做一個自己的版本：功能簡單、隨時能用，而且可以帶自己的 API Key。這是獨立的個人開源專案，與 Typeless 或 OpenAI 沒有隸屬關係。

## 下載哪個版本？

在 [Release](https://github.com/gsn943314/Oto/releases/latest) 可以選：

- **直接使用**：Apple Silicon 下載 `arm64.dmg` 或 `arm64.zip`；Intel 下載 `x64.dmg` 或 `x64.zip`，不必安裝開發工具。
- **自行建置**：下載 `Oto-<版本>-source.zip`、GitHub 的 Source code，或 clone 倉庫，再照 [建置說明](../README.md#build-from-source) 操作。
- **檔案校驗**：`SHA256SUMS.txt` 提供各下載檔的 SHA-256。

## 使用方式

1. 到 [Releases](https://github.com/gsn943314/Oto/releases/latest) 下載符合電腦的版本：Apple Silicon 選 arm64，Intel 選 x64。
2. 把 **Oto.app** 放進「應用程式」。這是未經 Apple 公證的版本；若被阻擋，先嘗試開啟一次，再到「系統設定 → 隱私權與安全性 → 仍要打開」，依提示認證並確認開啟。完整步驟見 [開啟與權限指南](../SECURITY_WARNING_SOLUTION.md)。開啟後到 Settings 填入**自己的 [OpenAI API Key](https://platform.openai.com/api-keys)** 並儲存。API 費用由 OpenAI 向使用者帳號收取，需有可用額度與模型存取權限。
3. 允許麥克風權限，並到「系統設定 → 隱私權與安全性 → 輔助使用」開啟 App 權限。
4. 在「Dictate anywhere → Trigger key」選 Control、fn 或右 Option。切到其他 App 的輸入框，單按觸發鍵開始錄音，再按一次停止並轉成文字。

主視窗縮小或隱藏時也能使用；錄音及處理狀態會顯示在螢幕下方，也可以在滑鼠旁顯示。無法自動貼上的輸入框，可以自行從剪貼簿貼上。也能直接點 App 內的錄音按鈕。

可自動偵測語言或指定語言；中文結果會轉成台灣用語的繁體中文。介面目前為英文。這個倉庫是 macOS 版，不包含手機版。

## 資料與隱私

倉庫和下載檔不包含作者的 API Key、錄音或 History。每位使用者自行設定 Key；設定與轉錄紀錄保存在各自電腦的 App 資料夾。錄音會傳到 OpenAI 的 GPT Transcribe API 辨識，並非離線辨識，也不是邊說邊輸出的即時逐字稿。

API Key 優先使用 macOS Keychain 支援的 Electron safeStorage 保護；舊有 fallback 僅是 Base64 與設定檔混淆，不等於安全加密。完整資料處理與安裝說明請見 [英文 README](../README.md)。

## 簡單架構

- **React + TypeScript**：介面、錄音、設定、History 與狀態動畫。
- **Electron 主程序**：管理視窗、本機儲存、剪貼簿與 OpenAI API。
- **Swift 小程式**：偵測全域觸發鍵、確認輔助使用權限、把文字貼進目前的 App。
- **GPT Transcribe API（gpt-transcribe）**：錄音停止後，將音訊轉成文字。

沒有額外架設的後端；使用者直接透過自己的 Key 連到 OpenAI。從原始碼安裝與建置步驟見 [README](../README.md#build-from-source)。

這版已從 Whisper 遷移到 `gpt-transcribe`。原有 OpenAI API Key 通常可以沿用，需有模型使用權限與可用額度；其他使用者仍要自行填寫 Key。沒有自動切回 Whisper 的機制。詳見 [官方模型文件](https://developers.openai.com/api/docs/models/gpt-transcribe)。

本機自行重建時，簽章腳本會優先使用鑰匙圈內的 `Oto Local Development` 憑證；沒有憑證時使用 ad-hoc 簽章，不需要付費 Apple 開發者帳號。固定身分可減少重建後重新授權，但切換簽章時仍可能需要最後授權一次。憑證私鑰只留在本機，GitHub Release 使用 ad-hoc 簽章。詳見 [建置與簽章](../PACKAGING.md)。

## 授權

採用 [MIT](../LICENSE)：可自由使用、修改、分享與商用，需保留授權及版權聲明。歡迎回饋改進，但沒有強制要求。
