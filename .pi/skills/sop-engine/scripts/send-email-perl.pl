#!/usr/bin/perl
# Simple email sender using Gmail SMTP
# Usage: perl send-email-perl.pl <to> <subject> <body_file>

use strict;
use warnings;
use Net::SMTP;
use MIME::Base64;
use File::Slurp qw(read_file);

my $usage = "Usage: $0 <to> <subject> <body_file>\n";
die $usage unless @ARGV >= 3;

my ($to, $subject, $body_file) = @ARGV;

# Get credentials from environment
my $user = $ENV{POPEBOT_EMAIL_USER} || $ENV{SMTP_USER};
my $pass = $ENV{POPEBOT_EMAIL_PASS} || $ENV{SMTP_PASS};

die "Missing POPEBOT_EMAIL_USER\n" unless $user;
die "Missing POPEBOT_EMAIL_PASS\n" unless $pass;

# Read body
my $body = read_file($body_file) or die "Cannot read $body_file: $!\n";

# Build email
my $from = $user;
my $message = <<"EMAIL";
To: $to
Subject: $subject
From: PopeBot Agent <$user>
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

$body
EMAIL

# Try to send via Gmail SMTP
print "Connecting to Gmail SMTP...\n";

eval {
    my $smtp = Net::SMTP->new(
        Host => 'smtp.gmail.com',
        Port => 587,
        Hello => 'localhost',
        Timeout => 30,
    );
    
    die "Could not connect to SMTP server\n" unless $smtp;
    
    $smtp->starttls(
        Hello => 'smtp.gmail.com',
    );
    
    $smtp->auth($user, $pass) or die "Authentication failed\n";
    
    $smtp->mail($from);
    $smtp->to($to);
    
    $smtp->data();
    $smtp->datasend($message);
    $smtp->dataend();
    
    $smtp->quit;
    
    print "Email sent successfully!\n";
};

if ($@) {
    print "Error: $@\n";
    print "Note: This environment may not support direct SMTP connections.\n";
    print "In production, use the email-agent skill.\n";
    exit 1;
}

exit 0;
