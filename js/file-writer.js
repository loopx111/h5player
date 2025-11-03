/**
 * 文件写入模块 - 独立处理App和浏览器环境的文件保存
 * 避免修改庞大的video-player.js文件
 */

class FileWriter {
    constructor() {
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        this.supportedVideoFormats = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    }

    // 检查是否在HBuilderX App环境中
    isAppEnvironment() {
        return typeof plus !== 'undefined' && plus.io;
    }

    // 主文件保存方法 - 根据环境选择保存方式
    async saveFile(fileName, blob, fileId = '') {
        console.log('FileWriter: 开始保存文件:', fileName, '大小:', blob.size, 'bytes');
        
        try {
            let fileUrl;
            
            if (this.isAppEnvironment()) {
                // App环境：保存到_doc目录
                console.log('FileWriter: App环境，使用_doc目录');
                fileUrl = await this.saveToAppFileSystem(fileName, blob);
            } else {
                // 浏览器环境：使用Blob URL
                console.log('FileWriter: 浏览器环境，使用Blob URL');
                fileUrl = URL.createObjectURL(blob);
            }
            
            console.log('FileWriter: 文件保存成功:', fileUrl);
            return fileUrl;
            
        } catch (error) {
            console.error('FileWriter: 文件保存失败:', error);
            throw error;
        }
    }

    // 保存文件到App文件系统
    async saveToAppFileSystem(fileName, blob) {
        return new Promise((resolve, reject) => {
            console.log('FileWriter: 开始保存到App文件系统，文件名:', fileName);
            
            // 使用5+ Runtime API保存文件到_doc目录
            this.saveFileWithPlusAPI(fileName, blob).then(resolve).catch(reject);
        });
    }

    // 使用5+ Runtime API保存文件到_doc目录
    async saveFileWithPlusAPI(fileName, blob) {
        return new Promise((resolve, reject) => {
            console.log('FileWriter: 使用5+ API保存文件到_doc目录:', fileName);
            
            // 直接使用_doc目录，无需权限检查
            console.log('FileWriter: ✓ _doc目录无需权限检查，直接保存文件');
            
            // 将Blob转换为ArrayBuffer
            const reader = new FileReader();
            reader.onload = () => {
                console.log('FileWriter: Blob转换完成，开始写入_doc目录...');
                const arrayBuffer = reader.result;
                
                // 直接使用_doc目录（应用私有文档目录，无需权限）
                plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
                    console.log('FileWriter: 解析_doc目录成功');
                    console.log('FileWriter: _doc目录信息 - 名称:', entry.name, '完整路径:', entry.fullPath);
                    
                    entry.getFile(fileName, { create: true }, (fileEntry) => {
                        console.log('FileWriter: 文件创建成功，开始写入数据...');
                        fileEntry.createWriter((writer) => {
                            writer.onwrite = () => {
                                console.log('FileWriter: ✓ 文件写入成功');
                                const fileUrl = fileEntry.toLocalURL();
                                console.log('FileWriter: 文件已保存到_doc目录:', fileUrl, '文件名:', fileName, '文件大小:', blob.size);
                                
                                // 验证文件是否真的保存成功
                                plus.io.resolveLocalFileSystemURL(fileUrl, (savedFile) => {
                                    savedFile.file((fileInfo) => {
                                        console.log('FileWriter: ✓ 文件验证成功，实际大小:', fileInfo.size, 'bytes');
                                        resolve(fileUrl);
                                    }, (verifyError) => {
                                        console.warn('FileWriter: 文件验证失败，但写入成功:', verifyError);
                                        resolve(fileUrl);
                                    });
                                }, (verifyError) => {
                                    console.warn('FileWriter: 文件URL验证失败，但写入成功:', verifyError);
                                    resolve(fileUrl);
                                });
                            };
                            
                            writer.onerror = (e) => {
                                console.error('FileWriter: ✗ 文件写入错误:', e);
                                console.error('FileWriter: 写入错误详情:', e.message, e.code);
                                
                                // 尝试使用更简单的写入方式
                                console.log('FileWriter: 尝试使用备用写入方案...');
                                this.saveFileWithAlternativeMethod(fileName, arrayBuffer).then(resolve).catch(reject);
                            };
                            
                            // 添加写入超时监控
                            const writeTimeout = setTimeout(() => {
                                console.error('FileWriter: ✗ 文件写入超时（10秒），触发备用方案');
                                writer.onwrite = null; // 防止重复触发
                                writer.onerror = null;
                                
                                // 强制触发备用方法
                                console.log('FileWriter: 强制切换到备用写入方案...');
                                this.saveFileWithAlternativeMethod(fileName, arrayBuffer).then(resolve).catch(reject);
                            }, 10000);
                            
                            // 创建Blob并写入
                            const writeBlob = new Blob([new Uint8Array(arrayBuffer)]);
                            console.log('FileWriter: 开始写入文件数据，大小:', writeBlob.size);
                            
                            // 添加写入进度监控
                            writer.onprogress = (e) => {
                                console.log('FileWriter: 写入进度:', e.loaded, '/', e.total);
                                
                                // 重置超时计时器
                                clearTimeout(writeTimeout);
                                setTimeout(() => {
                                    writeTimeout.refresh();
                                }, 0);
                            };
                            
                            // 清除超时计时器当写入成功时
                            const originalOnWrite = writer.onwrite;
                            writer.onwrite = () => {
                                clearTimeout(writeTimeout);
                                originalOnWrite();
                            };
                            
                            // 清除超时计时器当写入错误时
                            const originalOnError = writer.onerror;
                            writer.onerror = (e) => {
                                clearTimeout(writeTimeout);
                                originalOnError(e);
                            };
                            
                            console.log('FileWriter: 调用writer.write()...');
                            writer.write(writeBlob);
                            
                        }, (error) => {
                            console.error('FileWriter: 创建文件写入器失败:', error);
                            reject(error);
                        });
                    }, (error) => {
                        console.error('FileWriter: 创建文件失败:', error);
                        reject(error);
                    });
                }, (error) => {
                    console.error('FileWriter: 解析_doc目录失败:', error);
                    
                    // _doc目录访问失败，可能是5+ API问题
                    console.error('FileWriter: _doc目录访问异常，检查5+ Runtime环境');
                    reject(new Error('无法访问_doc目录，请检查5+ Runtime环境'));
                });
            };
            
            reader.onerror = (e) => {
                console.error('FileWriter: ✗ Blob转换失败:', e);
                reject(e);
            };
            
            // 开始读取Blob数据
            reader.readAsArrayBuffer(blob);
        });
    }

    // 备用文件保存方法
    async saveFileWithAlternativeMethod(fileName, arrayBuffer) {
        return new Promise((resolve, reject) => {
            console.log('FileWriter: 使用备用方法保存文件:', fileName, '文件大小:', arrayBuffer.byteLength, 'bytes');
            
            // 尝试使用更简单的文件保存方式
            const fileData = new Uint8Array(arrayBuffer);
            
            // 使用plus.io直接写入文件
            plus.io.resolveLocalFileSystemURL('_doc/' + fileName, (fileEntry) => {
                console.log('FileWriter: 备用方法：找到现有文件，直接写入');
                fileEntry.createWriter((writer) => {
                    writer.onwrite = () => {
                        console.log('FileWriter: ✓ 备用方法文件写入成功');
                        const fileUrl = fileEntry.toLocalURL();
                        console.log('FileWriter: 备用方法文件保存到:', fileUrl);
                        resolve(fileUrl);
                    };
                    writer.onerror = (e) => {
                        console.error('FileWriter: 备用方法写入失败:', e);
                        reject(e);
                    };
                    
                    // 添加写入超时
                    const altTimeout = setTimeout(() => {
                        console.error('FileWriter: 备用方法写入超时');
                        reject(new Error('备用方法写入超时'));
                    }, 10000);
                    
                    writer.onwrite = () => {
                        clearTimeout(altTimeout);
                        console.log('FileWriter: ✓ 备用方法文件写入成功');
                        const fileUrl = fileEntry.toLocalURL();
                        console.log('FileWriter: 备用方法文件保存到:', fileUrl);
                        resolve(fileUrl);
                    };
                    
                    writer.onerror = (e) => {
                        clearTimeout(altTimeout);
                        console.error('FileWriter: 备用方法写入失败:', e);
                        reject(e);
                    };
                    
                    console.log('FileWriter: 备用方法开始写入数据...');
                    writer.write(new Blob([fileData]));
                }, reject);
            }, () => {
                // 文件不存在，先创建
                console.log('FileWriter: 备用方法：文件不存在，创建新文件');
                plus.io.resolveLocalSystemURL('_doc', (rootEntry) => {
                    rootEntry.getFile(fileName, {create: true}, (fileEntry) => {
                        fileEntry.createWriter((writer) => {
                            writer.onwrite = () => {
                                console.log('FileWriter: ✓ 备用方法创建并写入成功');
                                const fileUrl = fileEntry.toLocalURL();
                                console.log('FileWriter: 备用方法文件保存到:', fileUrl);
                                resolve(fileUrl);
                            };
                            writer.onerror = (e) => {
                                console.error('FileWriter: 备用方法创建写入失败:', e);
                                reject(e);
                            };
                            
                            // 添加写入超时
                            const altTimeout = setTimeout(() => {
                                console.error('FileWriter: 备用方法创建写入超时');
                                reject(new Error('备用方法创建写入超时'));
                            }, 10000);
                            
                            writer.onwrite = () => {
                                clearTimeout(altTimeout);
                                console.log('FileWriter: ✓ 备用方法创建并写入成功');
                                const fileUrl = fileEntry.toLocalURL();
                                console.log('FileWriter: 备用方法文件保存到:', fileUrl);
                                resolve(fileUrl);
                            };
                            
                            writer.onerror = (e) => {
                                clearTimeout(altTimeout);
                                console.error('FileWriter: 备用方法创建写入失败:', e);
                                reject(e);
                            };
                            
                            console.log('FileWriter: 备用方法开始创建并写入数据...');
                            writer.write(new Blob([fileData]));
                        }, reject);
                    }, reject);
                }, reject);
            });
        });
    }

    // 清理文件URL（浏览器环境）
    revokeFileUrl(fileUrl) {
        if (fileUrl && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
            console.log('FileWriter: 已清理Blob URL:', fileUrl);
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
    window.fileWriter = new FileWriter();
    console.log('FileWriter模块已加载到全局作用域');
}

// 确保没有export语句

// 确保没有export语句