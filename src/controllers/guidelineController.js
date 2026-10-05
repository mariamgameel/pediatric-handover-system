const Guideline = require("../models/Guideline");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

// Helper to create URL-safe slug
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-");
};

// List all guidelines with optional filters and search
const getGuidelines = catchAsync(async (req, res, next) => {
    const { category, targetAgeGroup, status, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (targetAgeGroup) filter.targetAgeGroup = targetAgeGroup;
    if (status) {
        filter.status = status;
    } else {
        // By default show Active guidelines for regular clinicians, unless Admin
        if (req.user.role !== "Admin") {
            filter.status = "Active";
        }
    }

    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { summary: { $regex: search, $options: "i" } },
            { "dosageFormulas.drug": { $regex: search, $options: "i" } },
        ];
    }

    const guidelines = await Guideline.find(filter)
        .populate("author", "userId name role")
        .populate("approvedBy", "userId name role")
        .sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        count: guidelines.length,
        data: { guidelines },
    });
});

// Get a single guideline by ID or Slug
const getGuidelineById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let guideline;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        guideline = await Guideline.findById(id)
            .populate("author", "userId name role")
            .populate("approvedBy", "userId name role");
    } else {
        guideline = await Guideline.findOne({ slug: id.toLowerCase() })
            .populate("author", "userId name role")
            .populate("approvedBy", "userId name role");
    }

    if (!guideline) {
        return next(new AppError("Clinical guideline not found", 404));
    }

    res.status(200).json({
        success: true,
        data: { guideline },
    });
});

// Admin or Consultant creates a new guideline
const createGuideline = catchAsync(async (req, res, next) => {
    const {
        title,
        category,
        targetAgeGroup,
        summary,
        contentMarkdown,
        dosageFormulas,
        references,
        version,
        status,
    } = req.body;

    let baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;
    while (await Guideline.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
    }

    const guideline = await Guideline.create({
        title,
        slug,
        category,
        targetAgeGroup: targetAgeGroup || "All_Pediatric",
        summary,
        contentMarkdown,
        dosageFormulas: dosageFormulas || [],
        references: references || [],
        version: version || "1.0",
        status: status || "Active",
        author: req.user._id,
        approvedBy: req.user._id,
        reviewedAt: new Date(),
    });

    await logAudit({
        req,
        action: "CREATE_GUIDELINE",
        entity: "Guideline",
        entityId: guideline._id,
        newValue: {
            title: guideline.title,
            category: guideline.category,
            version: guideline.version,
            status: guideline.status,
        },
    });

    res.status(201).json({
        success: true,
        message: "Pediatric guideline created successfully",
        data: { guideline },
    });
});

// Admin or Consultant updates an existing guideline
const updateGuideline = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const guideline = await Guideline.findById(id);

    if (!guideline) {
        return next(new AppError("Guideline not found", 404));
    }

    const previousValue = {
        title: guideline.title,
        category: guideline.category,
        summary: guideline.summary,
        version: guideline.version,
        status: guideline.status,
    };

    if (req.body.title && req.body.title !== guideline.title) {
        let baseSlug = slugify(req.body.title);
        let slug = baseSlug;
        let counter = 1;
        while (await Guideline.findOne({ slug, _id: { $ne: guideline._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        guideline.slug = slug;
    }

    Object.assign(guideline, req.body);
    guideline.reviewedAt = new Date();
    guideline.approvedBy = req.user._id;

    await guideline.save();

    await logAudit({
        req,
        action: "UPDATE_GUIDELINE",
        entity: "Guideline",
        entityId: guideline._id,
        previousValue,
        newValue: {
            title: guideline.title,
            category: guideline.category,
            summary: guideline.summary,
            version: guideline.version,
            status: guideline.status,
        },
    });

    res.status(200).json({
        success: true,
        message: "Guideline updated successfully",
        data: { guideline },
    });
});

// Admin deletes or archives a guideline
const deleteGuideline = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const guideline = await Guideline.findById(id);

    if (!guideline) {
        return next(new AppError("Guideline not found", 404));
    }

    await Guideline.findByIdAndDelete(id);

    await logAudit({
        req,
        action: "DELETE_GUIDELINE",
        entity: "Guideline",
        entityId: id,
        previousValue: {
            title: guideline.title,
            category: guideline.category,
            version: guideline.version,
        },
    });

    res.status(200).json({
        success: true,
        message: "Guideline deleted successfully",
    });
});

module.exports = {
    getGuidelines,
    getGuidelineById,
    createGuideline,
    updateGuideline,
    deleteGuideline,
};
