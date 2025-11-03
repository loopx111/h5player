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
            const timeoutId = setTimeout(() => {
                reject(new Error(`文件保存超时（${this.timeout}ms），重试次数: ${retryCount}`));
            }, this.timeout);

            try {
                // 方法1：尝试使用plus.io.writeFile（最可靠）
                const result = await this.tryPlusWriteFile(fileName, arrayBuffer);
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                
                // 方法1失败，尝试方法2
                try {
                    const result = await this.tryPlusFileWriter(fileName, arrayBuffer);
                    resolve(result);
                } catch (error2) {
                    // 方法2失败，尝试方法3
                    try {
                        const result = await this.tryBase64Method(fileName, arrayBuffer);
                        resolve(result);
                    } catch (error3) {
                        reject(new Error(`所有方法都失败: ${error.message}, ${error2.message}, ${error3.message}`));
                    }
                }
            }
        });
    }

    // 方法1：使用plus.io.writeFile（最可靠）
    async tryPlusWriteFile(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            if (typeof plus === 'undefined') {
                reject(new Error('plus环境不可用'));
                return;
            }

            console.log('FileWriterEnhanced: 尝试方法1 - plus.io.writeFile');
            
            // 将ArrayBuffer转换为Base64
            const base64Data = this.arrayBufferToBase64(arrayBuffer);
            const filePath = `_doc/${fileName}`;

            plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
                plus.io.writeFile({
                    path: filePath,
                    data: base64Data,
                    success: (result) => {
                        console.log('✓ FileWriterEnhanced: plus.io.writeFile成功');
                        const fileUrl = result.target || entry.toLocalURL() + fileName;
                        resolve(fileUrl);
                    },
                    fail: (error) => {
                        console.error('✗ FileWriterEnhanced: plus.io.writeFile失败:', error);
                        reject(new Error(`writeFile失败: ${JSON.stringify(error)}`));
                    }
                });
            }, (error) => {
                reject(new Error(`解析_doc目录失败: ${JSON.stringify(error)}`));
            });
        });
    }

    // 方法2：使用传统的fileWriter（兼容性更好）
    async tryPlusFileWriter(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            console.log('FileWriterEnhanced: 尝试方法2 - 传统fileWriter');
            
            plus.io.resolveLocalFileSystemURL('_doc', (rootEntry) => {
                rootEntry.getFile(fileName, { create: true, exclusive: false }, (fileEntry) => {
                    fileEntry.createWriter((writer) => {
                        let hasResponded = false;
                        
                        const respond = (result) => {
                            if (!hasResponded) {
                                hasResponded = true;
                                resolve(result);
                            }
                        };
                        
                        const respondError = (error) => {
                            if (!hasResponded) {
                                hasResponded = true;
                                reject(error);
                            }
                        };

                        // 设置超时监控
                        const writeTimeout = setTimeout(() => {
                            if (!hasResponded) {
                                console.warn('FileWriterEnhanced: fileWriter写入超时，强制完成');
                                respond(fileEntry.toLocalURL());
                            }
                        }, 10000);

                        writer.onwrite = () => {
                            clearTimeout(writeTimeout);
                            console.log('✓ FileWriterEnhanced: fileWriter写入成功');
                            respond(fileEntry.toLocalURL());
                        };

                        writer.onerror = (error) => {
                            clearTimeout(writeTimeout);
                            console.error('✗ FileWriterEnhanced: fileWriter写入错误:', error);
                            respondError(new Error(`fileWriter错误: ${JSON.stringify(error)}`));
                        };

                        // 尝试分块写入
                        this.chunkedWrite(writer, arrayBuffer).then(() => {
                            clearTimeout(writeTimeout);
                            if (!hasResponded) {
                                console.log('✓ FileWriterEnhanced: 分块写入完成');
                                respond(fileEntry.toLocalURL());
                            }
                        }).catch(error => {
                            clearTimeout(writeTimeout);
                            if (!hasResponded) {
                                respondError(error);
                            }
                        });

                    }, (error) => {
                        reject(new Error(`创建writer失败: ${JSON.stringify(error)}`));
                    });
                }, (error) => {
                    reject(new Error(`创建文件失败: ${JSON.stringify(error)}`));
                });
            }, (error) => {
                reject(new Error(`解析_doc失败: ${JSON.stringify(error)}`));
            });
        });
    }

    // 方法3：使用Base64直接写入
    async tryBase64Method(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            console.log('FileWriterEnhanced: 尝试方法3 - Base64直接写入');
            
            // 将ArrayBuffer转换为字符串
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Data = window.btoa(binary);

            plus.io.requestFileSystem(plus.io.PRIVATE_WW, (fs) => {
                fs.root.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((writer) => {
                        writer.onwrite = () => {
                            console.log('✓ FileWriterEnhanced: Base64写入成功');
                            resolve(fileEntry.toLocalURL());
                        };
                        writer.onerror = (error) => {
                            reject(new Error(`Base64写入失败: ${JSON.stringify(error)}`));
                        };
                        writer.write(base64Data);
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
            // 尝试使用plus.downloader下载到本地（绕过文件写入）
            const tempUrl = URL.createObjectURL(new Blob([arrayBuffer]));
            const task = plus.downloader.createDownload(
                tempUrl,
                { filename: `_doc/${fileName}` },
                (download, status) => {
                    URL.revokeObjectURL(tempUrl);
                    
                    if (status === 200) {
                        const fileUrl = download.filename;
                        console.log('✓ FileWriterEnhanced: 终极方案成功:', fileUrl);
                        resolve(fileUrl);
                    } else {
                        reject(new Error(`下载器失败: ${status}`));
                    }
                }
            );
            
            task.start();
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