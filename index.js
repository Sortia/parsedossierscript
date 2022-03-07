const fs = require('fs');
const mmm = require('mmmagic');
const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const { Poppler } = require("node-poppler");

const types = {
    'passport': 'PASPORT',
    'buyerQuestionnaire': 'ANKETA',
    'offerAgreement': 'SOGLASIE',
    'buyerPhoto': 'FOTOGRAFIYA',
    'vehiclePassport': 'PTS',
    'driverLicense': 'VODITELSKOE_UDOSTOVERENIE',
    'snils': 'SNILS',
    'sts': 'STS',
    'invoice': 'SCHETA_NA_OPLATU',
    'saleContractAndCheck': 'DOGOVOR_KUPLI-PRODAZHI',
    'firstPayment': 'OPLATA_PERVONACHALNOGO_VZNOSA',
    'kasko': 'KASKO',
    'commissionContract': 'DOGOVOR_KOMISSII_AGENTSKIY',
    'acceptanceCertificate': 'AKT_PRIEMA_PEREDACHI_AVTO',
    'addShopServices': 'ADDSHOPSERVICES',
    'powerAttorney': 'DOVERENNOST_NA_PRODAZHU_AVTOMOBILYA',
    'statementBroker': 'ZAYAVLENIYA_BROKER',
    'loanAgreement': 'KREDITNYY_DOGOVOR',
    'repaymentMethods': 'SPOSOBY_POGASHENIYA_KREDITA',
    'certificate': 'SERTIFIKAT',
    'medicalInsuranceContract': 'DOGOVOR_MEDITSINSKOGO_STRAKHOVANIYA',
    'loanApplication': 'ZAYAVLENIYE_O_PREDOSTAVLENII_KREDITA',
    'borrowerQuestionnaire': 'ANKETA_ZAYEMSHCHIKA',
    'otherDocuments': 'OTHER',
};
const dossierPath = 'documents/dossier';
const classifierPath = 'documents/classifier';
const tempPath = 'documents/temp';
const POPPLER_BIN_PATH = '/usr/bin';

fs.readdir(dossierPath, (err, files) => {
    files.forEach(uuid => {
        fs.readdir(`${dossierPath}/${uuid}`, (err, files) => {
            files.forEach(type => {
                fs.readdir(`${dossierPath}/${uuid}/${type}`, async (err, files) => {
                    const lastVersion = Math.max(...files);

                    await processDocument(uuid, type, lastVersion);
                });
            });
        });
    });
});

async function processDocument(uuid, type, lastVersion) {
    const oldFilePath = `${dossierPath}/${uuid}/${type}/${lastVersion}/${type}`;
    const newFolderPath = `${classifierPath}/${uuid}/${types[type]}`;

    if (!fs.existsSync(newFolderPath)){
        fs.mkdirSync(newFolderPath, { recursive: true });
    }

    return magic.detectFile(oldFilePath, async (err, result) => {
        if (err) throw err;

        await copyFile(result, oldFilePath, newFolderPath, uuid, type);
    });
}

async function copyFile(mimeType, oldFilePath, newFolderPath, uuid, type) {
    if (mimeType === 'application/pdf') {
        await splitPdf(oldFilePath, uuid, type).then((pages) => {
            pages.map((pagePath, i) => {
                fs.renameSync(pagePath, `${newFolderPath}/${i + 1}#${uuidv4()}.jpg`);
            })
        });
    } else {
        const ext = mime.extension(mimeType)

        fs.copyFile(oldFilePath, `${newFolderPath}/1#${uuidv4()}.${ext}`, err => {
            if (err) throw err;
        });
    }
}

async function splitPdf(path, uuid, type) {
    const poppler = new Poppler(POPPLER_BIN_PATH);
    const splitOutputPath = `${tempPath}/${uuid}/${type}`;

    if (!fs.existsSync(splitOutputPath)){
        fs.mkdirSync(splitOutputPath, { recursive: true });
    }

    await poppler.pdfToCairo(path, `${splitOutputPath}/${type}`, {
        jpegFile: true
    });

    const pages = fs.readdirSync(splitOutputPath);

    return pages.map((page) => `${splitOutputPath}/${page}`)
}