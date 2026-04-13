"""
灵笔前端页面功能测试
测试目标：
1. NovelList 页面 - 创建小说功能
2. WorldBuilder 页面 - 确认按钮检查
3. 页面元素探测
"""

from playwright.sync_api import sync_playwright
import time

def test_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 设置超时
        page.set_default_timeout(10000)

        print("=" * 50)
        print("灵笔前端页面测试")
        print("=" * 50)

        # 1. 测试首页（NovelList）
        print("\n[测试 1] NovelList 页面...")
        try:
            page.goto('http://localhost:3001')
            page.wait_for_load_state('networkidle')

            # 截图
            page.screenshot(path='/tmp/novel_list.png', full_page=True)
            print("✅ 页面加载成功，截图保存: /tmp/novel_list.png")

            # 检查页面标题
            title = page.title()
            print(f"页面标题: {title}")

            # 探测所有按钮
            buttons = page.locator('button').all()
            print(f"发现按钮数量: {len(buttons)}")

            for i, btn in enumerate(buttons):
                try:
                    text = btn.inner_text()
                    is_disabled = btn.is_disabled()
                    print(f"  按钮 {i+1}: '{text}' (disabled: {is_disabled})")
                except:
                    print(f"  按钮 {i+1}: 无法获取文本")

            # 检查是否有"创建小说"按钮
            create_btn = page.locator('button:has-text("创建"), button:has-text("新建")')
            if create_btn.count() > 0:
                print("✅ 发现创建按钮")
            else:
                print("❌ 未发现创建按钮")

            # 探测输入框
            inputs = page.locator('input').all()
            print(f"发现输入框数量: {len(inputs)}")

            # 探测链接
            links = page.locator('a').all()
            print(f"发现链接数量: {len(links)}")

        except Exception as e:
            print(f"❌ NovelList 测试失败: {e}")

        # 2. 测试创建小说流程
        print("\n[测试 2] 创建小说流程...")
        try:
            # 查找创建小说的入口
            create_btns = page.locator('button:has-text("创建")')
            if create_btns.count() > 0:
                create_btns.first.click()
                page.wait_for_load_state('networkidle')
                page.screenshot(path='/tmp/create_novel.png', full_page=True)
                print("✅ 点击创建按钮成功")

                # 检查是否有输入框
                title_input = page.locator('input[type="text"], input:not([type])')
                if title_input.count() > 0:
                    print("✅ 发现标题输入框")
                    # 尝试输入
                    title_input.first.fill("测试小说")
                    print("✅ 输入标题成功")
                else:
                    print("❌ 未发现标题输入框")

                # 检查提交按钮
                submit_btns = page.locator('button:has-text("确定"), button:has-text("提交"), button:has-text("创建")')
                if submit_btns.count() > 0:
                    print("✅ 发现提交按钮")
                else:
                    print("❌ 未发现提交/确认按钮 - 这是问题所在！")

        except Exception as e:
            print(f"❌ 创建小说测试失败: {e}")

        # 3. 探测页面 DOM 结构
        print("\n[测试 3] DOM 结构分析...")
        try:
            content = page.content()
            # 保存完整 HTML
            with open('/tmp/page_html.html', 'w') as f:
                f.write(content)
            print("✅ DOM 已保存到 /tmp/page_html.html")

            # 检查是否有 React 根节点
            root = page.locator('#root')
            if root.count() > 0:
                root_content = root.inner_html()[:500]
                print(f"Root 内容摘要: {root_content[:200]}...")

        except Exception as e:
            print(f"❌ DOM 分析失败: {e}")

        # 4. 测试路由跳转（如果有小说ID）
        print("\n[测试 4] 测试 WorldBuilder 页面...")
        try:
            # 尝试访问 WorldBuilder 页面（需要先创建小说）
            page.goto('http://localhost:3001/novels/test-novel/world-builder')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/world_builder.png', full_page=True)
            print("✅ WorldBuilder 页面加载成功")

            # 检查关键按钮
            all_buttons = page.locator('button').all()
            print(f"WorldBuilder 按钮数量: {len(all_buttons)}")

            for btn in all_buttons:
                try:
                    text = btn.inner_text()
                    print(f"  按钮: '{text}'")
                except:
                    pass

            # 检查确认相关按钮
            confirm_btns = page.locator('button:has-text("确认"), button:has-text("确定"), button:has-text("使用")')
            if confirm_btns.count() > 0:
                print("✅ 发现确认按钮")
            else:
                print("❌ 未发现确认按钮 - 产品逻辑问题！")

            # 检查继续按钮
            next_btns = page.locator('button:has-text("继续"), button:has-text("下一步")')
            if next_btns.count() > 0:
                print("⚠️ 发现继续/下一步按钮（但可能缺少确认步骤）")

        except Exception as e:
            print(f"❌ WorldBuilder 测试失败: {e}")

        browser.close()

        print("\n" + "=" * 50)
        print("测试完成")
        print("=" * 50)

if __name__ == '__main__':
    test_pages()