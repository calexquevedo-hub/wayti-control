import nodemailer from "nodemailer";
import { SystemParamsModel } from "../models/SystemParams";
import { decryptSecret } from "./vault";
export async function buildMailer() {
    const params = await SystemParamsModel.findOne();
    if (!params) {
        throw new Error("Parâmetros de e-mail não configurados.");
    }
    const provider = params.mailProvider;
    if (provider === "Gmail") {
        if (!params.gmailUser || !params.gmailAppPasswordEnc || !params.gmailAppPasswordIv || !params.gmailAppPasswordTag) {
            throw new Error("Credenciais do Gmail incompletas.");
        }
        const pass = decryptSecret({
            iv: params.gmailAppPasswordIv,
            data: params.gmailAppPasswordEnc,
            tag: params.gmailAppPasswordTag,
        });
        return nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { user: params.gmailUser, pass },
        });
    }
    if (provider === "Office365") {
        if (!params.office365User || !params.office365PassEnc || !params.office365PassIv || !params.office365PassTag) {
            throw new Error("Credenciais do Office365 não configuradas.");
        }
        const pass = decryptSecret({
            iv: params.office365PassIv,
            data: params.office365PassEnc,
            tag: params.office365PassTag,
        });
        return nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            auth: { user: params.office365User, pass },
        });
    }
    if (provider === "SendGrid") {
        if (!params.sendGridApiKeyEnc || !params.sendGridApiKeyIv || !params.sendGridApiKeyTag) {
            throw new Error("API key do SendGrid não configurada.");
        }
        const apiKey = decryptSecret({
            iv: params.sendGridApiKeyIv,
            data: params.sendGridApiKeyEnc,
            tag: params.sendGridApiKeyTag,
        });
        return nodemailer.createTransport({
            host: "smtp.sendgrid.net",
            port: 587,
            secure: false,
            auth: { user: "apikey", pass: apiKey },
        });
    }
    if (provider === "AmazonSES") {
        if (!params.sesSmtpUser || !params.sesSmtpPassEnc || !params.sesSmtpPassIv || !params.sesSmtpPassTag) {
            throw new Error("Credenciais SMTP do SES não configuradas.");
        }
        const pass = decryptSecret({
            iv: params.sesSmtpPassIv,
            data: params.sesSmtpPassEnc,
            tag: params.sesSmtpPassTag,
        });
        const host = `email-smtp.${params.sesRegion || "us-east-1"}.amazonaws.com`;
        return nodemailer.createTransport({
            host,
            port: 587,
            secure: false,
            auth: { user: params.sesSmtpUser, pass },
        });
    }
    if (provider === "Mailgun") {
        if (!params.mailgunApiKeyEnc || !params.mailgunApiKeyIv || !params.mailgunApiKeyTag) {
            throw new Error("API key do Mailgun não configurada.");
        }
        const apiKey = decryptSecret({
            iv: params.mailgunApiKeyIv,
            data: params.mailgunApiKeyEnc,
            tag: params.mailgunApiKeyTag,
        });
        return nodemailer.createTransport({
            host: "smtp.mailgun.org",
            port: 587,
            secure: false,
            auth: { user: "postmaster", pass: apiKey },
        });
    }
    if (!params.smtpHost || !params.smtpUser || !params.smtpPassEnc || !params.smtpPassIv || !params.smtpPassTag) {
        throw new Error("SMTP da empresa não configurado.");
    }
    const smtpPass = decryptSecret({
        iv: params.smtpPassIv,
        data: params.smtpPassEnc,
        tag: params.smtpPassTag,
    });
    return nodemailer.createTransport({
        host: params.smtpHost,
        port: params.smtpPort ?? 587,
        secure: params.smtpSecure ?? false,
        auth: { user: params.smtpUser, pass: smtpPass },
    });
}
