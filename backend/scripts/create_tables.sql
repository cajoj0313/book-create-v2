-- 灵笔项目 MySQL 建表脚本
-- 执行：mysql -u root -p lingbi < create_tables.sql

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==================== 小说主表 ====================
DROP TABLE IF EXISTS `novels`;
CREATE TABLE `novels` (
  `novel_id` VARCHAR(36) PRIMARY KEY COMMENT '小说 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '小说标题',
  `genre` VARCHAR(100) DEFAULT '都市职场' COMMENT '题材类型',
  `theme` JSON COMMENT '主题标签数组',
  `target_chapters` INT DEFAULT 12 COMMENT '目标章节数',
  `status` VARCHAR(50) DEFAULT 'planning' COMMENT '当前状态',
  `current_phase` VARCHAR(50) DEFAULT 'world_building' COMMENT '当前阶段',
  `completed_chapters` INT DEFAULT 0 COMMENT '已完成章节数',
  `word_count` INT DEFAULT 0 COMMENT '总字数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_status` (`status`),
  INDEX `idx_phase` (`current_phase`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说主表';

-- ==================== 世界观设定表 ====================
DROP TABLE IF EXISTS `world_settings`;
CREATE TABLE `world_settings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '小说 ID',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `background` JSON COMMENT '背景设定',
  `male_lead` JSON COMMENT '男主设定',
  `female_lead` JSON COMMENT '女主设定',
  `emotion_arc` JSON COMMENT '感情线弧度',
  `theme` JSON COMMENT '故事主题',
  `main_conflict` JSON COMMENT '核心冲突',
  `supporting_chars` JSON COMMENT '配角设定',
  `power_system` JSON COMMENT '能力体系',
  `special_elements` JSON COMMENT '特殊元素',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT `fk_world_setting_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='世界观设定表';

-- ==================== 大纲表 ====================
DROP TABLE IF EXISTS `outlines`;
CREATE TABLE `outlines` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '小说 ID',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `genre` VARCHAR(100) COMMENT '题材',
  `main_conflict` JSON COMMENT '核心冲突',
  `character_growth_curve` JSON COMMENT '人物成长曲线',
  `foreshadowing_plan` JSON COMMENT '伏笔计划',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  CONSTRAINT `fk_outline_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大纲表';

-- ==================== 大纲卷表 ====================
DROP TABLE IF EXISTS `outline_volumes`;
CREATE TABLE `outline_volumes` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL COMMENT '小说 ID',
  `outline_id` BIGINT NOT NULL COMMENT '大纲 ID',
  `volume_id` VARCHAR(36) COMMENT '卷 ID',
  `name` VARCHAR(255) COMMENT '卷名',
  `chapters_range_start` INT COMMENT '起始章节',
  `chapters_range_end` INT COMMENT '结束章节',
  `theme` TEXT COMMENT '主题',
  `arc_summary` TEXT COMMENT '卷摘要',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT `fk_volume_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_volume_outline` FOREIGN KEY (`outline_id`) REFERENCES `outlines`(`id`) ON DELETE CASCADE,
  INDEX `idx_outline` (`outline_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大纲卷表';

-- ==================== 大纲章节表 ====================
DROP TABLE IF EXISTS `outline_chapters`;
CREATE TABLE `outline_chapters` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL COMMENT '小说 ID',
  `outline_id` BIGINT NOT NULL COMMENT '大纲 ID',
  `chapter_num` INT NOT NULL COMMENT '章节号',
  `title` VARCHAR(255) COMMENT '章节标题',
  `volume_id` VARCHAR(36) COMMENT '所属卷 ID',
  `key_events` JSON COMMENT '核心事件数组',
  `turning_points` JSON COMMENT '转折点数组',
  `character_growth` JSON COMMENT '人物成长',
  `foreshadowing` JSON COMMENT '伏笔',
  `emotion_stage` VARCHAR(50) COMMENT '感情阶段',
  `emotion_progress` JSON COMMENT '感情进展',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT `fk_ochapter_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ochapter_outline` FOREIGN KEY (`outline_id`) REFERENCES `outlines`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_chapter` (`novel_id`, `chapter_num`),
  INDEX `idx_outline` (`outline_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大纲章节表';

-- ==================== 章节正文表 ====================
DROP TABLE IF EXISTS `chapters`;
CREATE TABLE `chapters` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL COMMENT '小说 ID',
  `chapter_num` INT NOT NULL COMMENT '章节号',
  `title` VARCHAR(255) COMMENT '章节标题',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `content` LONGTEXT COMMENT '正文内容',
  `word_count` INT DEFAULT 0 COMMENT '字数',
  `summary` JSON COMMENT '章节摘要',
  `character_updates` JSON COMMENT '人物状态更新',
  `foreshadowing_updates` JSON COMMENT '伏笔更新',
  `timeline_additions` JSON COMMENT '时间线新增',
  `validation_status` JSON COMMENT '校验状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  CONSTRAINT `fk_chapter_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_chapter` (`novel_id`, `chapter_num`),
  INDEX `idx_novel_chapter` (`novel_id`, `chapter_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节正文表';

-- ==================== 故事梗概表 ====================
DROP TABLE IF EXISTS `story_synopsis`;
CREATE TABLE `story_synopsis` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '小说 ID',
  `story_content` LONGTEXT COMMENT '故事梗概正文 3000-5000 字',
  `key_plot_points` JSON COMMENT '关键情节节点',
  `character_arc` JSON COMMENT '人物成长弧光',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT `fk_synopsis_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事梗概表';

-- ==================== 人物库表 ====================
DROP TABLE IF EXISTS `characters`;
CREATE TABLE `characters` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL COMMENT '小说 ID',
  `character_id` VARCHAR(36) COMMENT '人物 ID',
  `name` VARCHAR(100) COMMENT '人物名称',
  `role` VARCHAR(50) COMMENT '角色类型',
  `character_type` VARCHAR(50) COMMENT '人物类型',
  `age` INT COMMENT '年龄',
  `gender` VARCHAR(20) COMMENT '性别',
  `appearance` TEXT COMMENT '外貌描述',
  `personality` JSON COMMENT '性格特点数组',
  `background` TEXT COMMENT '背景故事',
  `inner_wound` TEXT COMMENT '内心创伤',
  `growth_arc` TEXT COMMENT '成长弧光',
  `abilities` JSON COMMENT '能力设定',
  `goals` JSON COMMENT '目标数组',
  `emotional_arc` JSON COMMENT '感情弧线',
  `relationships` JSON COMMENT '人物关系数组',
  `current_state` JSON COMMENT '当前状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  CONSTRAINT `fk_character_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`),
  INDEX `idx_character` (`character_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='人物库表';

-- ==================== 章节版本历史表 ====================
DROP TABLE IF EXISTS `chapter_versions`;
CREATE TABLE `chapter_versions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `chapter_id` BIGINT NOT NULL COMMENT '章节 ID',
  `novel_id` VARCHAR(36) NOT NULL COMMENT '小说 ID',
  `chapter_num` INT NOT NULL COMMENT '章节号',
  `version` INT NOT NULL COMMENT '版本号',
  `content` LONGTEXT COMMENT '正文内容',
  `change_summary` TEXT COMMENT '变更摘要',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT `fk_cversion_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cversion_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_chapter` (`chapter_id`),
  INDEX `idx_novel_version` (`novel_id`, `chapter_num`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节版本历史表';

-- ==================== 校验报告表 ====================
DROP TABLE IF EXISTS `validation_reports`;
CREATE TABLE `validation_reports` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键 ID',
  `novel_id` VARCHAR(36) NOT NULL COMMENT '小说 ID',
  `chapter_num` INT COMMENT '章节号，NULL 表示全书校验',
  `validated_at` DATETIME COMMENT '校验时间',
  `validation_type` VARCHAR(50) COMMENT '校验类型',
  `issues` JSON COMMENT '问题列表',
  `statistics` JSON COMMENT '统计信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  CONSTRAINT `fk_vreport_novel` FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel_chapter` (`novel_id`, `chapter_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校验报告表';

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 初始化数据 ====================
-- 测试数据（可选）
-- INSERT INTO novels (novel_id, title, genre, target_chapters) VALUES ('test-001', '测试小说', '都市职场', 12);
