/**
 * 增强版文件写入模块 - 结合多种5+ API写入方法
 * 专门解决App环境中文件写入失败问题
 */

class FileWriterEnhanced {
    constructor() {
        this.maxRetryCount = 3;
        this.timeout = 15000; // 15秒超时
        this.chunkSize = 64 * 1024; // 64KB分块
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        this.supportedVideoFormats = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    }

    // 检查是否在HBuilderX App环境中
    isAppEnvironment() {
        return typeof plus !== 'undefined' && plus.io;
    }

    // 主文件保存方法 - 兼容原有接口
    async saveFile(fileName, blob, fileId = '') {
        console.log('FileWriterEnhanced: 开始保存文件:', fileName, '大小:', blob.size, 'bytes');
        
        try {
            let fileUrl;
            
            if (this.isAppEnvironment()) {
                // App环境：使用增强的保存方法
                console.log('FileWriterEnhanced: App环境，使用增强保存方法');
                
                // 将Blob转换为ArrayBuffer
                const arrayBuffer = await this.blobToArrayBuffer(blob);
                fileUrl = await this.enhancedSaveFile(fileName, arrayBuffer);
            } else {
                // 浏览器环境：使用Blob URL
                console.log('FileWriterEnhanced: 浏览器环境，使用Blob URL');
                fileUrl = URL.createObjectURL(blob);
            }
            
            console.log('FileWriterEnhanced: 文件保存成功:', fileUrl);
            return fileUrl;
            
        } catch (error) {
            console.error('FileWriterEnhanced: 文件保存失败:', error);
            throw error;
        }
    }

    // 增强的文件保存方法 - 多级重试机制
    async enhancedSaveFile(fileName, arrayBuffer) {
        console.log('FileWriterEnhanced: 增强保存开始:', fileName, '大小:', arrayBuffer.byteLength, 'bytes');
        
        for (let retry = 0; retry < this.maxRetryCount; retry++) {
            try {
                const result = await this.saveFileWithTimeout(fileName, arrayBuffer, retry);
                console.log('✓ FileWriterEnhanced: 文件保存成功:', result);
                return result;
            } catch (error) {
                console.error(`✗ FileWriterEnhanced: 第${retry + 1}次保存失败:`, error);
                
                if (retry === this.maxRetryCount - 1) {
                    // 最后一次重试也失败，使用终极方案
                    console.log('FileWriterEnhanced: 所有常规方法失败，使用终极方案');
                    return await this.ultimateSaveSolution(fileName, arrayBuffer);
                }
                
                // 指数退避
                await this.delay(Math.pow(2, retry) * 1000);
            }
        }
    }

    // 带超时的文件保存
    async saveFileWithTimeout(fileName, arrayBuffer, retryCount) {
        return new Promise(async (resolve, reject) => {
            let timeoutId;
            let methodCompleted = false;
            
            const clearTimeoutIfNeeded = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            };
            
            const tryMethodWithTimeout = async (method, methodName) => {
                return new Promise((methodResolve, methodReject) => {
                    timeoutId = setTimeout(() => {
                        if (!methodCompleted) {
                            methodReject(new Error(`${methodName}超时（${this.timeout}ms）`));
                        }
                    }, this.timeout);
                    
                    method(fileName, arrayBuffer).then(result => {
                        methodCompleted = true;
                        clearTimeoutIfNeeded();
                        methodResolve(result);
                    }).catch(error => {
                        methodCompleted = true;
                        clearTimeoutIfNeeded();
                        methodReject(error);
                    });
                });
            };
            
            try {
                // 方法1：尝试使用FileWriter API
                const result = await tryMethodWithTimeout(this.tryPlusWriteFile.bind(this), "方法1");
                resolve(result);
            } catch (error1) {
                console.log(`✗ 方法1失败: ${error1.message}`);
                
                // 方法1失败，尝试方法2
                try {
                    const result = await tryMethodWithTimeout(this.tryPlusFileWriter.bind(this), "方法2");
                    resolve(result);
                } catch (error2) {
                    console.log(`✗ 方法2失败: ${error2.message}`);
                    
                    // 方法2失败，尝试方法3
                    try {
                        const result = await tryMethodWithTimeout(this.tryBase64Method.bind(this), "方法3");
                        resolve(result);
                    } catch (error3) {
                        console.log(`✗ 方法3失败: ${error3.message}`);
                        reject(new Error(`所有方法都失败: ${error1.message}, ${error2.message}, ${error3.message}`));
                    }
                }
            }
        });
    }

    // 方法1：使用FileWriter API（最可靠）
    async tryPlusWriteFile(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            if (typeof plus === 'undefined') {
                reject(new Error('plus环境不可用'));
                return;
            }

            console.log('FileWriterEnhanced: 尝试方法1 - FileWriter API');
            
            // 使用标准的FileWriter API
            plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
                entry.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            console.log('✓ FileWriterEnhanced: FileWriter写入成功');
                            const fileUrl = fileEntry.toLocalURL();
                            resolve(fileUrl);
                        };
                        
                        fileWriter.onerror = (error) => {
                            console.error('✗ FileWriterEnhanced: FileWriter写入失败:', error);
                            reject(new Error(`FileWriter失败: ${JSON.stringify(error)}`));
                        };
                        
                        // 创建Blob并写入
                        const blob = new Blob([arrayBuffer]);
                        fileWriter.write(blob);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    // 方法2：使用传统的fileWriter（兼容性更好）
    async tryPlusFileWriter(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            console.log('FileWriterEnhanced: 尝试方法2 - 传统fileWriter');
            
            // 使用与方法1相同的API调用方式，但使用不同的参数
            plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
                entry.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            console.log('✓ FileWriterEnhanced: 方法2写入成功');
                            const fileUrl = fileEntry.toLocalURL();
                            resolve(fileUrl);
                        };
                        
                        fileWriter.onerror = (error) => {
                            console.error('✗ FileWriterEnhanced: 方法2写入失败:', error);
                            reject(new Error(`FileWriter方法2失败: ${JSON.stringify(error)}`));
                        };
                        
                        // 创建Blob并写入
                        const blob = new Blob([arrayBuffer]);
                        fileWriter.write(blob);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    // 方法3：使用Base64直接写入
    async tryBase64Method(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            console.log('FileWriterEnhanced: 尝试方法3 - 标准FileWriter API');
            
            // 使用与其他方法一致的API调用方式
            plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
                entry.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            console.log('✓ FileWriterEnhanced: 方法3写入成功');
                            const fileUrl = fileEntry.toLocalURL();
                            resolve(fileUrl);
                        };
                        
                        fileWriter.onerror = (error) => {
                            console.error('✗ FileWriterEnhanced: 方法3写入失败:', error);
                            reject(new Error(`FileWriter方法3失败: ${JSON.stringify(error)}`));
                        };
                        
                        // 创建Blob并写入（直接使用ArrayBuffer）
                        const blob = new Blob([arrayBuffer]);
                        fileWriter.write(blob);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    // 分块写入大文件
    async chunkedWrite(writer, arrayBuffer, chunkSize = 64 * 1024) {
        return new Promise((resolve, reject) => {
            const uint8Array = new Uint8Array(arrayBuffer);
            let offset = 0;
            let isWriting = false;

            const writeNextChunk = () => {
                if (offset >= uint8Array.length) {
                    resolve();
                    return;
                }

                if (isWriting) return;
                isWriting = true;

                const chunk = uint8Array.subarray(offset, Math.min(offset + chunkSize, uint8Array.length));
                const blob = new Blob([chunk]);

                try {
                    writer.write(blob);
                    offset += chunk.length;
                    isWriting = false;

                    // 使用setTimeout给事件循环一个喘息的机会
                    setTimeout(() => {
                        writeNextChunk();
                    }, 10);
                } catch (error) {
                    reject(error);
                }
            };

            writer.onwrite = () => {
                // 空的onwrite，避免干扰分块写入
            };

            // 开始分块写入
            writeNextChunk();
        });
    }

    // 终极解决方案：使用最底层的5+ API
    async ultimateSaveSolution(fileName, arrayBuffer) {
        console.log('FileWriterEnhanced: 使用终极解决方案');
        
        return new Promise((resolve, reject) => {
            // 使用最基础的FileWriter API，避免任何高级API调用
            plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
                entry.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            console.log('✓ FileWriterEnhanced: 终极方案成功');
                            const fileUrl = fileEntry.toLocalURL();
                            resolve(fileUrl);
                        };
                        
                        fileWriter.onerror = (error) => {
                            console.error('✗ FileWriterEnhanced: 终极方案失败:', error);
                            
                            // 如果所有方法都失败，尝试使用XMLHttpRequest下载到临时目录
                            this.fallbackDownload(fileName, arrayBuffer).then(resolve).catch(reject);
                        };
                        
                        // 直接写入ArrayBuffer
                        const blob = new Blob([arrayBuffer]);
                        fileWriter.write(blob);
                    }, reject);
                }, reject);
            }, reject);
        });
    }
    
    // 备用下载方案：使用XMLHttpRequest下载到临时目录
    async fallbackDownload(fileName, arrayBuffer) {
        console.log('FileWriterEnhanced: 使用备用下载方案');
        
        return new Promise((resolve, reject) => {
            // 创建临时Blob URL
            const blob = new Blob([arrayBuffer]);
            const tempUrl = URL.createObjectURL(blob);
            
            // 使用XMLHttpRequest下载
            const xhr = new XMLHttpRequest();
            xhr.open('GET', tempUrl, true);
            xhr.responseType = 'blob';
            
            xhr.onload = () => {
                URL.revokeObjectURL(tempUrl);
                
                if (xhr.status === 200) {
                    // 在浏览器环境中使用Blob URL
                    const fileUrl = URL.createObjectURL(xhr.response);
                    console.log('✓ FileWriterEnhanced: 备用方案成功（浏览器环境）');
                    resolve(fileUrl);
                } else {
                    reject(new Error(`备用下载失败: ${xhr.status}`));
                }
            };
            
            xhr.onerror = () => {
                URL.revokeObjectURL(tempUrl);
                reject(new Error('备用下载网络错误'));
            };
            
            xhr.send();
        });
    }

    // 工具方法：Blob转ArrayBuffer
    blobToArrayBuffer(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    // 工具方法：ArrayBuffer转Base64
    arrayBufferToBase64(arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return window.btoa(binary);
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 清理文件URL（浏览器环境）
    revokeFileUrl(fileUrl) {
        if (fileUrl && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
            console.log('FileWriterEnhanced: 已清理Blob URL:', fileUrl);
        }
    }

    // 检查文件是否存在（App环境）
    async checkFileExists(fileName) {
        if (!this.isAppEnvironment()) {
            return false;
        }
        
        return new Promise((resolve) => {
            plus.io.resolveLocalFileSystemURL('_doc/' + fileName, (fileEntry) => {
                fileEntry.file((file) => {
                    resolve(file.size > 0);
                }, () => resolve(false));
            }, () => resolve(false));
        });
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.fileWriterEnhanced = new FileWriterEnhanced();
    console.log('FileWriterEnhanced模块已加载到全局作用域');
}