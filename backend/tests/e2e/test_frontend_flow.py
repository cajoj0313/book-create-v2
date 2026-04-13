"""
灵笔前端页面完整功能测试
"""

from playwright.sync_api import sync_playwright
import time

def test_full_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(15000)

        print("=" * 60)
        print("灵笔前端页面完整测试")
        print("=" * 60)

        # 1. 测试首页
        print("\n[步骤1] 访问首页...")
        page.goto('http://localhost:3001')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/step1_home.png')
        print("✅ 首页加载成功")

        # 2. 输入标题创建小说
        print("\n[步骤2] 创建小说...")
        title_input = page.locator('input[type="text"]').first
        title_input.fill("测试小说Playwright")
        print("✅ 输入标题")

        # 等待按钮启用
        page.wait_for_timeout(500)
        create_btn = page.locator('button:has-text("创建")')

        # 检查按钮状态
        is_disabled = create_btn.is_disabled()
        print(f"按钮状态: disabled={is_disabled}")

        if not is_disabled:
            create_btn.click()
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/step2_created.png')
            print("✅ 创建成功，已跳转")

            # 检查当前URL
            current_url = page.url
            print(f"当前URL: {current_url}")
        else:
            print("❌ 按钮仍为disabled状态")

        # 3. 检查世界观页面
        print("\n[步骤3] 检查世界观页面...")
        if '/world-setting' in page.url:
            print("✅ 已进入世界观页面")

            # 检查页面元素
            all_buttons = page.locator('button').all()
            print(f"发现按钮: {len(all_buttons)}个")
            for btn in all_buttons:
                try:
                    text = btn.inner_text()
                    print(f"  - {text}")
                except:
                    pass

            # 检查输入框
            textarea = page.locator('textarea').first
            if textarea.count() > 0:
                print("✅ 发现描述输入框")
            else:
                print("❌ 未发现描述输入框")

        # 4. 检查确认按钮逻辑
        print("\n[步骤4] 确认按钮检查...")

        # 在世界观页面，确认按钮应该在生成完成后出现
        confirm_btns = page.locator('button:has-text("确认"), button:has-text("使用"), button:has-text("确定")')
        if confirm_btns.count() > 0:
            print("✅ 发现确认按钮")
        else:
            print("⚠️ 当前无确认按钮（需要在生成后才会出现）")

            # 检查是否有"继续下一步"按钮
            next_btns = page.locator('button:has-text("继续"), button:has-text("下一步")')
            if next_btns.count() > 0:
                print("⚠️ 发现'继续'按钮（可能缺少确认步骤）")

        # 5. 检查生成按钮
        print("\n[步骤5] 检查生成按钮...")
        generate_btns = page.locator('button:has-text("生成"), button:has-text("开始")')
        if generate_btns.count() > 0:
            print("✅ 发现生成按钮")
        else:
            print("❌ 未发现生成按钮")

        browser.close()

        print("\n" + "=" * 60)
        print("测试完成，截图保存在 /tmp/")
        print("=" * 60)

if __name__ == '__main__':
    test_full_flow()