'use strict';

const Service = require("egg").Service;
const _ = require("lodash");
const validateUtil = require("@jianghujs/jianghu/app/common/validateUtil");
const fileUtil = require('@jianghujs/jianghu/app/common/fileUtil');
const { BizError, errorInfoEnum } = require("../constant/error");
const fs = require("fs");
const os = require("os"),
    nodePath = require("path"),
    fsPromises = require("fs").promises,
    readdir = fsPromises.readdir,
    stat = fsPromises.stat,
    rename = fsPromises.rename,
    unlink = fsPromises.unlink,
    lstat = fsPromises.lstat,
    util = require("util"),
    rimraf = util.promisify(require("rimraf")),
    exists = util.promisify(fs.exists),
    copyFile = util.promisify(fs.copyFile);

const actionDataScheme = Object.freeze({
    list: {
        type: "object",
        additionalProperties: true,
        required: ["path"],
        properties: {
            path: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
    mkdir: {
        type: "object",
        additionalProperties: true,
        required: ["path", "dir"],
        properties: {
            path: { anyOf: [{ type: "string" }, { type: "number" }] },
            dir: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
    moveFile: {
        type: "object",
        additionalProperties: true,
        required: ["fromDir", "toDir", "filename", "dir"],
        properties: {
            fromDir: { anyOf: [{ type: "string" }, { type: "number" }] },
            toDir: { anyOf: [{ type: "string" }, { type: "number" }] },
            filename: { anyOf: [{ type: "string" }, { type: "number" }] },
            dir: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
    copyFile: {
        type: "object",
        additionalProperties: true,
        required: ["fromDir", "toDir", "filename", "dir"],
        properties: {
            fromDir: { anyOf: [{ type: "string" }, { type: "number" }] },
            toDir: { anyOf: [{ type: "string" }, { type: "number" }] },
            filename: { anyOf: [{ type: "string" }, { type: "number" }] },
            dir: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
    renameFile: {
        type: "object",
        additionalProperties: true,
        required: ["path", "newFilename"],
        properties: {
            path: { anyOf: [{ type: "string" }, { type: "number" }] },
            newFilename: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
    delete: {
        type: "object",
        additionalProperties: true,
        required: ["path", "dir"],
        properties: {
            path: { anyOf: [{ type: "string" }, { type: "number" }] },
            dir: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
    useMaterial: {
        type: "object",
        additionalProperties: true,
        required: ["path", "fromDir", "toDir"],
        properties: {
            path: { anyOf: [{ type: "string" }, { type: "number" }] },
            fromDir: { anyOf: [{ type: "string" }, { type: "number" }] },
            toDir: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
    },
});

function pathCheck(path) {
    if (path.indexOf("../") > -1) {
        throw new BizError(errorInfoEnum.path_invalid);
    }
    if (path.endsWith("..")) {
        throw new BizError(errorInfoEnum.path_invalid);
    }
}

function pathCheckResult(path) {
    if (path.indexOf("../") > -1) {
        return false;
    }
    if (path.endsWith("..")) {
        return false;
    }
}

class MaterialService extends Service {

    async list() {
        const actionData = this.ctx.request.body.appData.actionData;
        validateUtil.validate(actionDataScheme.list, actionData);
        let { path, dir = 'materialRepo' } = actionData;
        const { uploadDir } = this.app.config;
        const materialDir = nodePath.join(uploadDir, dir);

        // dir 创建验证 articleMaterial/xxxx | articleMaterial/xxxx | materialRepo
        await this.loopCheckDir(uploadDir, dir);
        // path 创建验证 / | /xxx | /xxx/xxx
        await this.loopCheckDir(materialDir, path);
        let dirs = [],
            files = [];

        if (path[path.length - 1] !== "/") {
            path += "/";
        }

        const targetPath = nodePath.join(materialDir, path);
        let items = await readdir(targetPath, {
            withFileTypes: true,
        });

        for (let item of items) {
            let isFile = item.isFile(),
                isDir = item.isDirectory();

            if (!isFile && !isDir) {
                continue;
            }

            let result = {
                type: isFile ? "file" : "dir",
                path: path + item.name,
            };

            result.basename = result.name = nodePath.basename(result.path);

            if (isFile) {
                let fileStat = await stat(nodePath.join(materialDir, result.path));
                result.size = fileStat.size;
                result.extension = nodePath.extname(result.path).slice(1);
                result.name = nodePath.basename(
                    result.path,
                    "." + result.extension
                );
                files.push(result);
            } else {
                result.path += "/";
                dirs.push(result);
            }
        }

        const rows = dirs.concat(files);
        return { rows };
    }

    async mkdir() {
        const actionData = this.ctx.request.body.appData.actionData;
        validateUtil.validate(actionDataScheme.mkdir, actionData);
        const { uploadDir } = this.app.config;
        const { path, dir = 'materialRepo' } = actionData;
        const materialDir = nodePath.join(uploadDir, dir);
        pathCheck(path);
        const targetPath = nodePath.join(materialDir, path);
        await fsPromises.mkdir(targetPath, { recursive: true });
    }

    async copyFile() {
        const actionData = this.ctx.request.body.appData.actionData;
        const { uploadDir } = this.app.config;
        validateUtil.validate(actionDataScheme.copyFile, actionData);
        const { fromDir, toDir, filename, dir = 'materialRepo' } = actionData
        const materialDir = nodePath.join(uploadDir, dir);
        pathCheck(fromDir);
        pathCheck(toDir);
        const fromPath = nodePath.join(materialDir, fromDir, filename);
        const toPath = nodePath.join(materialDir, toDir, filename);
        if (!await exists(fromPath)) {
            throw new BizError(errorInfoEnum.target_file_not_exist);
        }
        await copyFile(fromPath, toPath);
    }

    async moveFile() {
        const actionData = this.ctx.request.body.appData.actionData;
        const { uploadDir } = this.app.config;
        validateUtil.validate(actionDataScheme.moveFile, actionData);
        const { fromDir, toDir, filename, dir = 'materialRepo' } = actionData;
        const materialDir = nodePath.join(uploadDir, dir);

        pathCheck(fromDir);
        pathCheck(toDir);
        const fromPath = nodePath.join(materialDir, fromDir, filename);
        const toPath = nodePath.join(materialDir, toDir, filename);
        if (!await exists(fromPath)) {
            throw new BizError(errorInfoEnum.target_file_not_exist);
        }
        await rename(fromPath, toPath);
    }

    async renameFile() {
        const actionData = this.ctx.request.body.appData.actionData;
        const { uploadDir } = this.app.config;
        validateUtil.validate(actionDataScheme.renameFile, actionData);
        const { path, newFilename, dir = 'materialRepo' } = actionData;
        const materialDir = nodePath.join(uploadDir, dir);

        pathCheck(path);
        const targetPath = nodePath.join(materialDir, path);
        // 兼容 windows \ 为目录分隔符
        const targetDir = targetPath.substring(0, this.getPathLastIndexOf(targetPath) + 1);
        const newFilenamePath = nodePath.join(targetDir, newFilename);

        const isFileExists = await exists(targetPath);
        if (!isFileExists) {
            throw new BizError(errorInfoEnum.target_file_not_exist);
        }
        await rename(targetPath, newFilenamePath);
    }

    getPathLastIndexOf(path) {
        if (path.includes("/")) {
            return path.lastIndexOf("/");
        } else if (path.includes("\\")) {
            return path.lastIndexOf("\\");
        }
        return -1;
    }

    async delete() {
        const actionData = this.ctx.request.body.appData.actionData;
        validateUtil.validate(actionDataScheme.delete, actionData);

        const { path, dir = 'materialRepo' } = actionData;
        const { uploadDir } = this.app.config;
        const materialDir = nodePath.join(uploadDir, dir);

        pathCheck(path);
        const targetPath = nodePath.join(materialDir, path);

        let stat = await lstat(targetPath),
            isDir = stat.isDirectory(),
            isFile = stat.isFile();
        if (isFile) {
            if (path.startsWith('/_recycle')) {
                await unlink(targetPath);
                return
            }

            await this.loopCheckDir(materialDir, '_recycle');
            const filename = path.substring(path.lastIndexOf('/') + 1);
            const recycleFilePath = nodePath.join(materialDir, '_recycle', filename);

            // 如果回收站文件存在则先删除回收站文件再移动
            if (await exists(recycleFilePath)) {
                await rimraf(recycleFilePath);
            }
            await rename(targetPath, recycleFilePath);
        } else if (isDir) {
            if (path.startsWith('/_recycle')) {
                await rimraf(targetPath);
                return
            }

            await this.loopCheckDir(materialDir, '_recycle');
            let tempPath = path;
            if (tempPath.endsWith("/")) { tempPath = tempPath.substring(0, path.length - 1); }
            const dirname = tempPath.substring(tempPath.lastIndexOf('/') + 1);
            const recycleDirPath = nodePath.join(materialDir, '_recycle', dirname);

            // 如果目标文件夹存在则只删除 targetPath
            if (await exists(recycleDirPath)) {
                await rimraf(targetPath);
            } else {
                await rename(targetPath, recycleDirPath);
            }
        }
    }

    async clearRecycle() {
        const { materialRepoDir } = this.app.config;
        const targetPath = nodePath.join(materialRepoDir, '_recycle', '/');
        await rimraf(targetPath);
    }

    async useMaterial() {
        const actionData = this.ctx.request.body.appData.actionData;
        validateUtil.validate(actionDataScheme.useMaterial, actionData);
        const { uploadDir, materialRepoDir } = this.app.config;
        const { path, fromDir = 'materialRepo', toDir = '' } = actionData;
        // 提取来源文件夹和目标文件夹
        const fromMaterialDir = fromDir ? nodePath.join(uploadDir, fromDir) : materialRepoDir;
        const toMaterialDir = toDir ? nodePath.join(uploadDir, toDir) : materialRepoDir;
        pathCheck(path);

        const fromPath = nodePath.join(fromMaterialDir, path);
        const stat = await lstat(fromPath);
        const isFile = stat.isFile();
        if (!isFile) {
            throw new BizError(errorInfoEnum.material_is_not_file);
        }
        // 创建文件名、创建文件夹
        const filename = path.substring(this.getPathLastIndexOf(path) + 1);
        let filenameStorage = `${Date.now()}_${filename}`;
        const isFileStorageExists = await exists(toMaterialDir);
        if (!isFileStorageExists) {
            await fileUtil.checkAndPrepareFilePath(toMaterialDir);
        }
        const stats = fs.statSync(fromPath);
        const downloadBasePath = nodePath.dirname(fromPath); // 文件所在目录
        const downloadPath = fromPath.split('upload')[1]; // 文件名
        const binarySize = stats.size; // 文件大小

        return {
            filename,
            downloadBasePath: `/${this.ctx.app.config.appId}/upload`,
            downloadPath: downloadPath.replace(/\\/g, '/'),
            binarySize
        }
        
    }

    async getFileInfo(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    const fileType = path.extname(filePath); // 获取文件类型
                    const fileSize = stats.size; // 获取文件大小（字节）

                    resolve({ fileType, fileSize });
                }
            });
        });
    }

    // 提供 base路径 + 后续衔接的路径循环创建下一级文件夹
    async loopCheckDir(baseDir, pathDir) {
        const dirArr = pathDir.split('/');
        let dirStr = ''
        for (const item of dirArr) {
            if (!item) continue;
            dirStr = dirStr ? dirStr + '/' + item : item;
            const fileStoragePath = nodePath.join(baseDir, dirStr);
            const isFileStorageExists = await exists(fileStoragePath);
            if (!isFileStorageExists) {
                await fileUtil.checkAndPrepareFilePath(fileStoragePath);
            }
        }
    }

}
module.exports = MaterialService;
