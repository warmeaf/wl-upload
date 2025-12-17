import fs from "node:fs";
import path from "node:path";

/**
 * 递归遍历目录，生成文件结构数据（文件在前，文件夹在后）
 * @param {string} dirPath - 要遍历的目录路径
 * @returns {Object} 目录结构数据
 */
function generateFileStructure(dirPath) {
  const dirNode = {
    type: "directory",
    children: {},
  };

  try {
    let files = fs.readdirSync(dirPath, { withFileTypes: true });

    // 排序：文件在前，文件夹在后；同类型按字母升序
    files = files.sort((a, b) => {
      if (a.isFile() && b.isDirectory()) return -1;
      if (a.isDirectory() && b.isFile()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);

      if (file.isDirectory()) {
        dirNode.children[file.name] = generateFileStructure(fullPath);
      } else if (file.isFile()) {
        dirNode.children[file.name] = {
          type: "file",
          readability: 0,
        };
      }
    }
  } catch (err) {
    console.error(`❌ 读取目录失败: ${dirPath}`, err.message);
    process.exit(1);
  }

  return dirNode;
}

/**
 * 主函数：解析参数 + 生成结构 + 写入文件
 */
async function main() {
  // 解析命令行参数
  const [, , targetDir, outputFileName] = process.argv;

  // 1. 验证参数完整性
  if (!targetDir) {
    console.error("❌ 错误：缺少目标目录参数");
    console.log("📝 使用格式：node generate-file-structure.js <目标目录> <输出文件名>");
    console.log("   示例：node generate-file-structure.js ./src structure.json");
    process.exit(1);
  }

  if (!outputFileName) {
    console.error("❌ 错误：缺少输出文件名参数");
    console.log("📝 使用格式：node generate-file-structure.js <目标目录> <输出文件名>");
    console.log("   示例：node generate-file-structure.js ./src structure.json");
    process.exit(1);
  }

  // 2. 验证目标目录有效性
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ 错误：目录不存在 -> ${targetDir}`);
    process.exit(1);
  }

  if (!fs.lstatSync(targetDir).isDirectory()) {
    console.error(`❌ 错误：${targetDir} 不是一个目录`);
    process.exit(1);
  }

  // 3. 生成文件结构
  console.log(`🔍 正在遍历目录：${targetDir}`);
  const rootDirName = path.basename(targetDir);
  const fileStructure = {
    [rootDirName]: generateFileStructure(targetDir),
  };

  // 4. 写入指定 JSON 文件（默认保存到当前工作目录）
  const outputPath = path.join(process.cwd(), outputFileName);
  try {
    fs.writeFileSync(outputPath, JSON.stringify(fileStructure, null, 2), "utf-8");
    console.log(`✅ 成功！文件已保存到：${outputPath}`);
  } catch (err) {
    console.error(`❌ 写入文件失败: ${outputPath}`, err.message);
    process.exit(1);
  }
}

// 执行主函数
main();
