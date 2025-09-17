const fs = require('fs');
const path = require('path');

// 找到所有需要修复的文件
const filesToFix = [
  './src/app/api/transactions/[id]/route.ts',
  './src/app/api/funds/[id]/route.ts',
  './src/app/api/funds/[id]/nav-records/route.ts',
  './src/app/api/funds/[id]/transactions/route.ts',
  './src/app/api/statistics/[id]/route.ts'
];

filesToFix.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 替换函数签名中的 params 类型
    content = content.replace(
      /{ params }: { params: { id: string } }/g,
      '{ params }: { params: Promise<{ id: string }> }'
    );

    // 在函数开始处添加 await params
    content = content.replace(
      /(export async function \w+\(\s*request: NextRequest,\s*{ params }: { params: Promise<{ id: string }> }\s*\) {\s*try {\s*)/g,
      '$1const { id } = await params;\n    '
    );

    // 替换所有 params.id 为 id
    content = content.replace(/params\.id/g, 'id');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
});

console.log('Params fixing completed!');