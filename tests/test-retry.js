// 验证 server/server.js 的端口重试逻辑：
// 1) 先用一个 dummy 服务占住 8199 端口
// 2) 3 秒后释放
// 3) 以 PORT=8199、短重试间隔启动 server.js
// 4) 断言它先打印重试告警，随后成功绑定端口
import { spawn } from 'child_process';
import http from 'http';

const PORT = 8199;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 10;

const dummy = http.createServer((req, res) => res.end('hold'));
dummy.listen(PORT, '0.0.0.0', () => {
  console.log(`[TEST] dummy 已占用端口 ${PORT}`);

  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      TASKSORTER_START_RETRIES: String(MAX_RETRIES),
      TASKSORTER_START_RETRY_DELAY: String(RETRY_DELAY),
    },
  });

  let out = '';
  child.stdout.on('data', (d) => (out += d.toString()));
  child.stderr.on('data', (d) => (out += d.toString()));

  // 3 秒后释放端口
  setTimeout(() => {
    console.log('[TEST] 释放端口');
    dummy.close();
  }, 3000);

  // 10 秒后检查结果
  setTimeout(() => {
    const retried = out.includes('EADDRINUSE');
    const ready = out.includes('已就绪');
    console.log('---- server.js 输出 ----');
    console.log(out.trim());
    console.log('---- 断言 ----');
    console.log(`重试告警出现: ${retried}`);
    console.log(`最终启动成功: ${ready}`);
    child.kill();
    if (retried && ready) {
      console.log('[TEST] PASS ✅');
      process.exit(0);
    } else {
      console.log('[TEST] FAIL ❌');
      process.exit(1);
    }
  }, 10000);
});
